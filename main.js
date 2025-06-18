// ID d'application Agora - nécessaire pour le service RTM (Real-Time Messaging)
// Utilisé pour la signalisation entre pairs afin d'établir des connexions WebRTC
let APP_ID = "98fbff14715044bab54a03730d060763"

// Jeton d'authentification (null signifie que nous utilisons l'authentification par ID d'application)
let token = null;
// Génère un ID utilisateur aléatoire pour cette session
let uid = String(Math.floor(Math.random() * 10000))

// Variables pour le client Agora RTM et le canal
let client;  // Instance du client RTM
let channel; // Canal RTM pour la signalisation

// Obtenir l'ID de la salle à partir des paramètres d'URL
let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

// Si aucun ID de salle n'est fourni, rediriger vers le lobby
if(!roomId){
    window.location = 'lobby.html'
}

// Variables de flux
let localStream;   // Flux média de l'utilisateur local
let remoteStream;  // Flux média de l'utilisateur distant
let peerConnection; // Connexion pair à pair WebRTC

// Configuration des serveurs ICE pour WebRTC
// Les serveurs STUN aident à établir des connexions pair à pair à travers les NAT et les pare-feu
const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

// Contraintes média pour getUserMedia
// Définit les exigences de qualité vidéo et audio
let constraints = {
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080},
    },
    audio:true
}

/**
 * Initialise l'application
 * - Crée et se connecte au service Agora RTM
 * - Rejoint le canal basé sur l'ID de la salle
 * - Configure les écouteurs d'événements
 * - Initialise le flux vidéo local
 */
let init = async () => {
    // Créer et se connecter à Agora RTM
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid, token})

    // Rejoindre le canal avec l'ID de salle de l'URL
    channel = client.createChannel(roomId)
    await channel.join()

    // Configurer les écouteurs d'événements pour les événements du canal
    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)

    // Écouter les messages pair à pair (pour la signalisation WebRTC)
    client.on('MessageFromPeer', handleMessageFromPeer)

    // Initialiser le flux vidéo local et l'afficher
    localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
    document.getElementById('user-1').srcObject = localStream
}

/**
 * Gère le départ d'un utilisateur du canal
 * - Cache la vidéo distante
 * - Restaure la vidéo locale à sa taille complète
 */
let handleUserLeft = (MemberId) => {
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('smallFrame')
}

/**
 * Traite les messages des pairs (signalisation WebRTC)
 * - Gère les offres, les réponses et les candidats ICE
 * - Fait partie du processus d'établissement de connexion WebRTC
 */
let handleMessageFromPeer = async (message, MemberId) => {
    // Analyser le message JSON
    message = JSON.parse(message.text)

    // Gérer le message d'offre - créer une réponse
    if(message.type === 'offer'){
        createAnswer(MemberId, message.offer)
    }

    // Gérer le message de réponse - ajouter la réponse pour compléter la connexion
    if(message.type === 'answer'){
        addAnswer(message.answer)
    }

    // Gérer le candidat ICE - l'ajouter à la connexion pair à pair
    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

/**
 * Gère l'arrivée d'un nouvel utilisateur dans le canal
 * - Initie le processus de connexion WebRTC en créant une offre
 */
let handleUserJoined = async (MemberId) => {
    console.log('Un nouvel utilisateur a rejoint le canal:', MemberId)
    createOffer(MemberId)
}

/**
 * Crée et configure la connexion pair à pair WebRTC
 * - Initialise la connexion avec les serveurs ICE
 * - Configure le flux distant
 * - Ajoute les pistes locales à la connexion
 * - Configure les gestionnaires d'événements pour les pistes entrantes et les candidats ICE
 */
let createPeerConnection = async (MemberId) => {
    // Créer la RTCPeerConnection avec les serveurs STUN
    peerConnection = new RTCPeerConnection(servers)

    // Configurer le flux média distant et le connecter à l'interface utilisateur
    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block'

    // Réduire la taille de la vidéo locale lors d'un appel
    document.getElementById('user-1').classList.add('smallFrame')

    // Si le flux local n'est pas encore initialisé, le faire maintenant
    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
        document.getElementById('user-1').srcObject = localStream
    }

    // Ajouter toutes les pistes locales à la connexion pair à pair
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    // Gérer les pistes entrantes du pair distant
    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    // Lorsque des candidats ICE sont générés, les envoyer au pair
    peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate', 'candidate':event.candidate})}, MemberId)
        }
    }
}

/**
 * Crée une offre pour initier la connexion WebRTC
 * - Crée la connexion pair à pair
 * - Génère une offre SDP
 * - La définit comme description locale
 * - L'envoie au pair via Agora RTM
 */
let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId)

    // Créer l'offre (Session Description Protocol)
    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    // Envoyer l'offre au pair
    client.sendMessageToPeer({text:JSON.stringify({'type':'offer', 'offer':offer})}, MemberId)
}

/**
 * Crée une réponse en réponse à une offre
 * - Crée la connexion pair à pair
 * - Définit la description distante à partir de l'offre
 * - Crée une réponse SDP
 * - La définit comme description locale
 * - L'envoie au pair via Agora RTM
 */
let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)

    // Définir la description distante à partir de l'offre reçue
    await peerConnection.setRemoteDescription(offer)

    // Créer une réponse
    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    // Envoyer la réponse au pair
    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, MemberId)
}

/**
 * Ajoute la réponse du pair distant pour compléter la connexion
 * - Définit la description distante si elle n'est pas déjà définie
 */
let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}

/**
 * Quitte le canal et se déconnecte d'Agora RTM
 * - Appelé lorsque l'utilisateur quitte la page
 */
let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

/**
 * Active/désactive la caméra
 * - Active/désactive la piste vidéo
 * - Met à jour la couleur du bouton pour indiquer l'état
 */
let toggleCamera = async () => {
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video')

    if(videoTrack.enabled){
        videoTrack.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)' // Rouge quand désactivé
    }else{
        videoTrack.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)' // Violet quand activé
    }
}

/**
 * Active/désactive le microphone
 * - Active/désactive la piste audio
 * - Met à jour la couleur du bouton pour indiquer l'état
 */
let toggleMic = async () => {
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')

    if(audioTrack.enabled){
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)' // Rouge quand désactivé
    }else{
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)' // Violet quand activé
    }
}

// Nettoyer lorsque l'utilisateur quitte la page
window.addEventListener('beforeunload', leaveChannel)

// Configurer les écouteurs d'événements pour les contrôles de l'interface utilisateur
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)

// Initialiser l'application
init()
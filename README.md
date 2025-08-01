# visioconference Platform 

````markdown
# 🎥 PeerMeet - Application de visioconférence P2P

**PeerMeet** est une application de visioconférence basée sur une architecture **peer-to-peer** (P2P) utilisant la technologie **WebRTC**, permettant des appels vidéo en temps réel sans passer par un serveur centralisé pour le transfert de données.

---

## 🚀 Fonctionnalités

- 📡 Connexion directe entre deux pairs (WebRTC)
- 🎥 Streaming audio et vidéo en temps réel
- 🔐 Communication sécurisée (cryptage natif WebRTC)
- ⚙️ Interface simple pour démarrer un appel
- 🌐 Compatible avec les navigateurs modernes (Chrome, Firefox…)

---

## 🧱 Technologies utilisées

| **HTML/CSS/JavaScript** | Interface utilisateur |
| **WebRTC API** | Connexion audio/vidéo en P2P |
| **Socket.io** (ou WebSocket) | Signalisation entre clients |

---

## 📸 Aperçu



## 🔄 Fonctionnement

1. L'utilisateur accède à la page d'accueil.
2. Une connexion WebSocket est utilisée pour l'échange de signaux (offre/answer/candidate).
3. WebRTC établit une connexion directe entre les deux navigateurs.
4. Le flux audio/vidéo est transmis directement en P2P sans serveur central.

---

## 📚 Références

* [WebRTC Official Docs](https://webrtc.org/)
* [MDN WebRTC Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
* [Socket.IO](https://socket.io/)


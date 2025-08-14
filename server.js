const fs = require("fs");
//============================================================//
const https = require("https");
//============================================================//
const express = require("express");
//============================================================//
const app = express();
//============================================================//
const socketio = require("socket.io");
//============================================================//
app.use(express.static(__dirname));
//============================================================//
// MADE KEY AND CERT TO RUN HTTPS //
const key = fs.readFileSync("cert.key");
const cert = fs.readFileSync("cert.crt");
//============================================================//
// WHEN USING HTTPS //
const expressServer = https.createServer({ key, cert }, app);
//============================================================//
const io = socketio(expressServer);
//============================================================//
// THIS WILL CONTAINS THE VISTING URL INFORMATION
const offers = [
  // offererUserName
  // offer
  // offerIceCandidates
  // answer
  // answererUserName
  // answererIceCandidates
];
//============================================================//
// THIS CONTAINS THE VISTING URL's SOCKET ID & USERNAME
const connectedSockets = [
  // username,
  // socketId
];
//============================================================//

//============================================================//
// SECOND STEP: SOMEONE HAS CONNECTED TO THE SOCKET.IO SERVER //
io.on("connection", (socket) => {
  //----------------------------------------------------------//
  const userName = socket.handshake.auth.userName;
  const passWord = socket.handshake.auth.passWord;
  //----------------------------------------------------------//
  if (passWord !== "X") {
    socket.disconnect(true);
    return;
  }
  //----------------------------------------------------------//
  // PUSH THE VISITOR TO connectedSockets[] ARRAY
  connectedSockets.push({
    socketId: socket.id,
    userName,
  });
  //----------------------------------------------------------//

  //----------------------------------------------------------//
  if (offers.length) {
    socket.emit("availableOffers", offers);
  }
  //----------------------------------------------------------//

  //---------------------------------------------------------------//
  // LISTENING FOR NEW OFFER AND EMIT/SEND THE VISTORS INFORMATION
  socket.on("newOffer", (newOffer) => {
    //-------------------------------------------------------------//
    // PUSH AVAILABLE VISITORS INFORMTION TO offers[] ARRAY
    offers.push({
      offererUserName: userName,
      offer: newOffer,
      offerIceCandidates: [],
      answererUserName: null,
      answer: null,
      answererIceCandidates: [],
    });
    // console.log(newOffer.sdp.slice(50));
    //-------------------------------------------------------------//
    // SEND THE CONNECTED SOCKETS TO EVERYONE CONNECTED EXCEPT CALLER
    socket.broadcast.emit("newOfferAwaiting", offers.slice(-1));
  });
  //----------------------------------------------------------//

  //----------------------------------------------------------//
  socket.on("sendIceCandidateToSignalingServer", (iceCandidateObj) => {
    // console.log(iceCandidateObj);
    const { didIOffer, iceUsername, iceCandidate } = iceCandidateObj;
    // console.log(iceCandidate);
    if (didIOffer) {
      const offerInOffers = offers.find((o) => o.userName === iceUsername);
      if (offerInOffers) {
        offerInOffers.offerIceCandidates.push(iceCandidate);
      }
    }
    // console.log(offers);
  });
  //----------------------------------------------------------//
});
//============================================================//

//============================================================//
// APPLICATION LISTENING ON PORT 7070//
expressServer.listen(7070);

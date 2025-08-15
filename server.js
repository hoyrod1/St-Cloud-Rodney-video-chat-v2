const fs = require("fs");
//========================================================================//
const https = require("https");
//========================================================================//
const express = require("express");
//========================================================================//
const app = express();
//========================================================================//
const socketio = require("socket.io");
//========================================================================//
app.use(express.static(__dirname));
//========================================================================//
// MADE KEY AND CERT TO RUN HTTPS //
const key = fs.readFileSync("cert.key");
const cert = fs.readFileSync("cert.crt");
//========================================================================//
// WHEN USING HTTPS //
const expressServer = https.createServer({ key, cert }, app);
//========================================================================//
const io = socketio(expressServer);
//========================================================================//
// THIS WILL CONTAINS THE VISTING URL INFORMATION
const offers = [
  // offererUserName
  // offer
  // offerIceCandidates
  // answer
  // answererUserName
  // answererIceCandidates
];
//========================================================================//
// THIS CONTAINS THE VISTING URL's SOCKET ID & USERNAME
const connectedSockets = [
  // username,
  // socketId
];
//========================================================================//

//========================================================================//
// SECOND STEP: SOMEONE HAS CONNECTED TO THE SOCKET.IO SERVER //
io.on("connection", (socket) => {
  //----------------------------------------------------------------------//
  const userName = socket.handshake.auth.userName;
  const passWord = socket.handshake.auth.passWord;
  //----------------------------------------------------------------------//
  if (passWord !== "X") {
    socket.disconnect(true);
    return;
  }
  //----------------------------------------------------------------------//
  // PUSH THE VISITOR TO connectedSockets[] ARRAY
  connectedSockets.push({
    socketId: socket.id,
    userName,
  });
  //----------------------------------------------------------------------//

  //----------------------------------------------------------------------//
  if (offers.length) {
    socket.emit("availableOffers", offers);
  }
  //----------------------------------------------------------------------//

  //----------------------------------------------------------------------//
  // LISTENING FOR NEW OFFER AND EMIT/SEND THE VISTORS INFORMATION
  socket.on("newOffer", (newOffer) => {
    //--------------------------------------------------------------------//
    // PUSH AVAILABLE VISITORS INFORMTION TO offers[] ARRAY
    offers.push({
      offererUserName: userName,
      offer: newOffer,
      offerIceCandidates: [],
      answererUserName: null,
      answer: null,
      answererIceCandidates: [],
    });
    console.log(newOffer.sdp.slice(50));
    //----------------------------------------------------------------------//
    // SEND THE CONNECTED SOCKETS TO EVERYONE CONNECTED EXCEPT CALLER
    socket.broadcast.emit("newOfferAwaiting", offers.slice(-1));
  });
  //------------------------------------------------------------------------//

  //------------------------------------------------------------------------//
  // LISTENING FOR NEW ANSWER AND
  socket.on("newAnswer", (offerObj, ackFunction) => {
    // console.log(offerObj);
    //------------------------------------------------------------------------//
    // EMIT THIS ANSWER(offerObj) BACK TO CLIENT 1 USING CLIENT1'S socketid
    const socketToAnswer = connectedSockets.find(
      (socket) => socket.userName === offerObj.offererUserName
    );
    //------------------------------------------------------------------------//
    if (!socketToAnswer) {
      console.log(`There is no matching "socket" to answer to!`);
      return;
    }
    //------------------------------------------------------------------------//
    // IF CLIENT1'S USERNAME EXIST EMIT TO IT USING CLIENT1'S UNIQUE ID
    const socketIdToAnswer = socketToAnswer.socketId;
    // console.log(socketIdToAnswer);
    // console.log(socketToAnswer);
    //------------------------------------------------------------------------//
    // FIND THE "offer" TO UPDATE SO WE CAN EMIT IT
    const offerToUpdate = offers.find(
      (offer) => offer.offererUserName === offerObj.offererUserName
    );
    // console.log(offerToUpdate);
    //------------------------------------------------------------------------//
    if (!offerToUpdate) {
      console.log(`There is no "offer" to update!`);
      return;
    }
    //------------------------------------------------------------------------//

    //------------------------------------------------------------------------//
    // SEND BACK TO ALL THE ANSWERER ALL THE "iceCandidates" WE HAVE ALREADY COLLECTED
    ackFunction(offerToUpdate.offerIceCandidates);
    //------------------------------------------------------------------------//

    //------------------------------------------------------------------------//
    // IF THERE'S A "offer" SET THE "answer" and "answererUserName" properties
    offerToUpdate.answer = offerObj.answer;
    offerToUpdate.answererUserName = userName;
    // offerToUpdate.answererUserName = offerObj.answererUserName;
    //------------------------------------------------------------------------//
    // SOCKET HAS A .to() WHICH ALLOWS TO EMITING TO A "room"
    // EVERY SOCKET HAS IT'S OWN ROOM
    socket.to(socketIdToAnswer).emit("answerResponse", offerToUpdate);
  });
  //--------------------------------------------------------------------------//

  //--------------------------------------------------------------------------//
  socket.on("sendIceCandidateToSignalingServer", (iceCandidateObj) => {
    // console.log(iceCandidateObj);
    const { didIOffer, iceUserName, iceCandidate } = iceCandidateObj;
    // console.log(iceCandidate);
    if (didIOffer) {
      // IF ICE IS COMING FROM THE OFFERER SEND TO THE ANSWERER
      const offerInOffers = offers.find((offer) => offer.offerUserName === iceUserName);
      if (offerInOffers) {
        offerInOffers.offerIceCandidates.push(iceCandidate);
        // 1. WHEN THE ANSWERER ANSWERS ALL THE EXISTING "iceCandidate" ARE SENT
        // 2. ANY CANDIDATES THAT COME IN AFTER THE OFFER HAS BEEN ANSWERED WILL BE PASSED THROUGH
        if (offerInOffers.answererUserName) {
          // PASS IT THROUGH TO THE OTHER SOCKETS
          const socketToSendTo = connectedSockets.find(
            (socket) => socket.userName === offerInOffers.answererUserName
          );
          if (socketToSendTo) {
            socket
              .to(socketToSendTo.socketId)
              .emit("receivedIceCandidateFromServer", iceCandidate);
          } else {
            console.log(`Ice Candidate received but could not find "answerer"!`);
          }
        }
      }
    } else {
      // IF ICE IS COMING FROM THE OFFERER SEND TO THE ANSWERER
      const offerInOffers = offers.find(
        (offer) => offer.answererUserName === iceUserName
      );
      // IF ICE IS COMING FROM THE ANSWERER SEND TO THE OFFERER
      // PASS IT THROUGH TO THE OTHER SOCKETS
      const socketToSendTo = connectedSockets.find(
        (socket) => socket.userName === offerInOffers.offererUserName
      );
      if (socketToSendTo) {
        socket
          .to(socketToSendTo.socketId)
          .emit("receivedIceCandidateFromServer", iceCandidate);
      } else {
        console.log(`Ice Candidate received but could not find "offerer"!`);
      }
    }
    // console.log(offers);
  });
  //------------------------------------------------------------------------//
});
//==========================================================================//

//==========================================================================//
// APPLICATION LISTENING ON PORT 7070//
expressServer.listen(7070);
//==========================================================================//

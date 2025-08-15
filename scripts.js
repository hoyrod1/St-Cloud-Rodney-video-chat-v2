const userName = "Rodney-" + Math.floor(Math.random() * 1000);
const passWord = "X";
document.querySelector("#user-name").innerHTML = userName;
//==========================================================================//

//==========================================================================//
// FIRST STEP: io.connect RUNS WHEN SOMEONE BROWSES TO THIS URL //
// NEXT STEP: GO TO server.js TO io.on() //
const socket = io.connect("https://192.168.1.208:7070/", {
  auth: {
    userName,
    passWord,
  },
});
//==========================================================================//

//==========================================================================//
const localVideoEl = document.querySelector("#local-video");
const remoteVideoEl = document.querySelector("#remote-video");
//==========================================================================//

//==========================================================================//
let localStream; //a var to hold the local video stream
let remoteStream; //a var to hold the remote video stream
let peerConnection; //the peerConnection that the two clients use to talk
let didIOffer = false;
//==========================================================================//

//======= peerConfiguration IS A OBJECT CONTAINING THE STUN SERVERS ========//
// THIS SETS THE "stun" SERVERS
let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};
//==========================================================================//

// 1. FIRST STEP IN INITIATING A CALL
//======================= BEGINNING OF call FUNCTION =======================//
//when a client initiates a call
const call = async (e) => {
  //------------------------------------------------------------------------//
  await fetchUserMedia();
  //------------------------------------------------------------------------//

  //------------------------------------------------------------------------//
  await createPeerConnection();
  //------------------------------------------------------------------------//

  //------------------------------------------------------------------------//
  try {
    // console.log("Creating offer...");
    const offer = await peerConnection.createOffer();
    // console.log(offer);
    peerConnection.setLocalDescription(offer);
    didIOffer = true;
    socket.emit("newOffer", offer); // This sends offer to signaling server //
  } catch (error) {
    console.log(error);
  }
  //------------------------------------------------------------------------//
};
//======================== ENDING OF call FUNCTION =========================//

// 2. SECOND STEP IN ANSWERING A CALL
//=================== BEGINNING OF answerOffer FUNCTION ====================//
const answerOffer = async (offerObj) => {
  //------------------------------------------------------------------------//
  await fetchUserMedia();
  //------------------------------------------------------------------------//

  //------------------------------------------------------------------------//
  await createPeerConnection(offerObj);
  //------------------------------------------------------------------------//

  //------------------------------------------------------------------------//
  const answer = await peerConnection.createAnswer({});
  //------------------------------------------------------------------------//

  //------------------------------------------------------------------------//
  // CLIENT2 uses the "answer" as the setLocalDescription
  await peerConnection.setLocalDescription(answer);
  //------------------------------------------------------------------------//
  // console.log(offerObj);
  // console.log(answer);
  // should have local-pranswer because client2 has set setLocalDescription on the "answer" (but it won't)
  // console.log(peerConnection.signalingState);
  //------------------------------------------------------------------------//
  // Add/set "answer" to the offerObj so the server knows which "offer" this is related to
  offerObj.answer = answer;
  //------------------------------------------------------------------------//
  // emit the "newAnswer" to the signaling server so it can emit back to CLIENT1
  // and expect a reponse from the server with the already existing ICE candidates
  const offerIceCandidates = await socket.emitWithAck("newAnswer", offerObj);
  offerIceCandidates.forEach((candidate) => {
    peerConnection.addIceCandidate(candidate);
    console.log(`========= Added Ice Candidate =========`);
  });
  console.log(offerIceCandidates);
  //------------------------------------------------------------------------//
};
//===================== ENDING OF answerOffer FUNCTION =====================//

// 3. THIRD STEP IN OFFER/CALL AND ANSWER/RESPONSE WITH THE "offere" & "answerer"
//=================== BEGINNING OF addAnswer FUNCTION ====================//
const addAnswer = async (offerObj) => {
  // "addAnswer" is called in the "socketListeners.js" file when "answerResponse" is emitted. //
  // at this point the "offer" and "answer" has been exchanged/set
  // CLIENT1 need to set the "setRemoteDescription"
  await peerConnection.setRemoteDescription(offerObj.answer);
  // console.log(peerConnection.signalingState);
};
//====================== ENDING OF addAnswer FUNCTION ======================//

//================= BEGINNING OF fetchUserMedia FUNCTION ===================//
//                THIS CREATES & SETS THE VIDEO & AUDIO TRACK               //
const fetchUserMedia = () => {
  return new Promise(async (resolve, reject) => {
    try {
      //--------------------------------------------------------------------//
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      //--------------------------------------------------------------------//

      //--------------------------------------------------------------------//
      localVideoEl.srcObject = stream;
      localStream = stream;
      //--------------------------------------------------------------------//
      resolve();
    } catch (error) {
      console.log(error);
      reject();
    }
  });
};
//=================== ENDING OF fetchUserMedia FUNCTION ====================//

//=============== BEGINNING OF createPeerConnection FUNCTION ===============//
//    INITIAL CREATION OF THE "RTCPeerConnection" WITH TH "stun" SERVERS    //
const createPeerConnection = (offerObj) => {
  return new Promise(async (resolve, rejects) => {
    //----------------------------------------------------------------------//
    peerConnection = await new RTCPeerConnection(peerConfiguration);
    //----------------------------------------------------------------------//

    //----------------------------------------------------------------------//
    remoteStream = new MediaStream();
    remoteVideoEl.srcObject = remoteStream;
    //----------------------------------------------------------------------//

    //----------------------------------------------------------------------//
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
    //----------------------------------------------------------------------//

    //----------------------------------------------------------------------//
    // THE SIGNALING STATE CHANGE OF THE "peerConnection"
    // peerConnection.addEventListener("signalingstatechange", (event) => {
    //   console.log(event);
    //   console.log(peerConnection.signalingState);
    // });
    //----------------------------------------------------------------------//
    peerConnection.addEventListener("icecandidate", (e) => {
      // console.log(e);
      if (e.candidate) {
        socket.emit("sendIceCandidateToSignalingServer", {
          iceCandidate: e.candidate,
          iceUserName: userName,
          didIOffer,
        });
      }
    });
    //----------------------------------------------------------------------//

    //----------------------------------------------------------------------//
    peerConnection.addEventListener("track", (event) => {
      console.log(`========== GOT A TRACK FROM THE OTHER PEER ==========`);
      console.log(event);
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track, remoteStream);
        console.log(
          `========== THE OTHER PEER'S VIDEO & AUDIO STREAM HAS BEEN ADDED ==========`
        );
      });
    });
    //----------------------------------------------------------------------//

    //----------------------------------------------------------------------//
    if (offerObj) {
      // offerObj will not be set when called from the call() function
      // offerObj will be set when called from answerOffer() function
      // console.log(peerConnection.signalingState); // stable
      await peerConnection.setRemoteDescription(offerObj.offer);
      // should be have remote offer because client2 has setRemoteDesc on the "offerObj"
      // console.log(peerConnection.signalingState);
    }
    //----------------------------------------------------------------------//

    //----------------------------------------------------------------------//
    resolve();
    //----------------------------------------------------------------------//
  });
};
//================ ENDING OF createPeerConnection FUNCTION =================//

//================ BEGINNING OF addNewIceCandidate FUNCTION ================//
const addNewIceCandidate = (iceCandidate) => {
  peerConnection.addIceCandidate(iceCandidate);
  console.log(`========= Added Ice Candidate =========`);
};
//================= ENDING OF addNewIceCandidate FUNCTION ==================//

//============= CACHE THE CALL BUTTON FROM THE index.html FILE =============//
document.querySelector("#call").addEventListener("click", call);
//==========================================================================//

const userName = "Rodney-" + Math.floor(Math.random() * 1000);
const passWord = "X";
document.querySelector("#user-name").innerHTML = userName;
//==========================================================================//

//==========================================================================//
// FIRST STEP: io.connect RUNS WHEN SOMEONE BROWSES TO THIS URL //
// NEXT STEP: GO TO server.js TO io.on() //
const socket = io.connect("https://localhost:7070/", {
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

//==========================================================================//
let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};
//==========================================================================//

//==========================================================================//
//when a client initiates a call
const call = async (e) => {
  //------------------------------------------------------------------------//
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  //------------------------------------------------------------------------//

  //------------------------------------------------------------------------//
  localVideoEl.srcObject = stream;
  localStream = stream;
  //------------------------------------------------------------------------//

  //------------------------------------------------------------------------//
  await createPeerConnection();
  //------------------------------------------------------------------------//

  //------------------------------------------------------------------------//
  try {
    console.log("Creating offer...");
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
//==========================================================================//

//==========================================================================//
const createPeerConnection = () => {
  return new Promise(async (resolve, rejects) => {
    //----------------------------------------------------------------------//
    peerConnection = await new RTCPeerConnection(peerConfiguration);
    //----------------------------------------------------------------------//
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
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
    resolve();
    //----------------------------------------------------------------------//
  });
};
//==========================================================================//

//==========================================================================//
document.querySelector("#call").addEventListener("click", call);
//==========================================================================//

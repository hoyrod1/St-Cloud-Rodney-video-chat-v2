// import { resolve } from "path";
// import { rejects } from "assert";
// const { resolve } = require("path");
// const { rejects } = require("assert");

const localVideoEl = document.querySelector("#local-video");
const remoteVideoEl = document.querySelector("#remote-video");

let localStream; //a var to hold the local video stream
let remoteStream; //a var to hold the remote video stream
let peerConnection; //the peerConnection that the two clients use to talk

let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

//when a client initiates a call
const call = async (e) => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localVideoEl.srcObject = stream;
  localStream = stream;

  await createPeerConnection();

  try {
    console.log("Creating offer...");
    const offer = await peerConnection.createOffer();
    console.log(offer);
  } catch (error) {
    console.log(error);
  }
};

const createPeerConnection = () => {
  return new Promise(async (resolve, rejects) => {
    peerConnection = await new RTCPeerConnection(peerConfiguration);
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
    peerConnection.addEventListener("icecanidate", (e) => {
      console.log(`.......Ice Canidate Found.......`);
      console.log(e);
    });
    resolve();
  });
};

document.querySelector("#call").addEventListener("click", call);

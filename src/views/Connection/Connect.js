import { Component } from 'react';
import SimplePeer from 'simple-peer';
import $ from 'jquery';
import socketIOClient, { connect } from 'socket.io-client';
import { store as NotifStore } from 'react-notifications-component';
import axios from 'axios';
import { store } from '../../redux/store';
import * as action from '../../redux/userRedux/userAction';
const socket = socketIOClient.connect(`${global.config.backendURL}`); //will be replaced by an appropriate room.
var connectedPeers = []; 
var myMediaStreamObj = new MediaStream();
var myScreenStreamObj = new MediaStream();
const videoQuality = [
  { width: 1280, height: 720 }, //720p
  { width: 640, height: 360 }, //360p
  { width: 426, height: 240 }, //240p
  { width: 320, height: 180 } //144p
];
store.subscribe(getVideoState);
store.subscribe(getAudioState);

function getVideoState() {
  let state = store.getState();
  return state.userReducer.video;
}
function getAudioState() {
  let state = store.getState();
  return state.userReducer.audio;
}


export class Peer {
  constructor(stream, room, initiator, their_id, their_name, my_id, type) {
    if (type == null) {
      type = 'video';
    }
    /* save constructor variable */
    this.stream = stream;
    this.room = room;
    this.initiator = initiator;
    this.their_id = their_id;
    this.their_name = their_name;
    this.my_id = my_id;
    this.type = type;

    /* initialize connection variables. */
    this.error = null;
    this.connected = false;
    this.ended = false;
    this.num_retries = 0;

    /* create a new simplepeer object for communication. */
    this.peer = new SimplePeer({
      initiator: initiator,
      stream: stream,
      sdpTransform: (sdp) => {
        let newSDP = sdp;
        newSDP = setMediaBitrate(newSDP, 'video', 233);
        newSDP = setMediaBitrate(newSDP, 'audio', 80);
        return newSDP;
      },
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: 'turn:numb.viagenie.ca',
            credential: 'HWeF3pu@u2RfeYD',
            username: 'veddandekar6@gmail.com'
          }
        ]
      }
    });

    /* add event listeners to handle simplepeer communication. */
    this.addEventListenersToPeer(this.peer);

  }

  addEventListenersToPeer(peer) {
    console.log(this);
    peer.on('error', (err) => {
      this.error = err;
    });

    peer.on('close', (_) => {
      this.close();
    });
    peer.on('signal', (data) => {
      var room = this.room;
      socket.emit('signalling', room, data, this.their_id, this.my_id, (resp) => {
        return;
      });
    });
    peer.on('connect', (data) => {
      this.connected = true;
      NotifStore.addNotification({
        title: 'Member entered call',
        message: 'New member joined the call!',
        type: 'success',
        container: 'top-right',
        animationIn: ['animated', 'fadeIn'],
        animationOut: ['animated', 'fadeOut'],
        dismiss: {
          duration: 3000,
          pauseOnHover: true
        }
      });
    });
    peer.on('stream', (data) => {
      const self = this;
      this.sharing = 0;

      // If screen shared is of type screen, don't add handlers
      if (this.next_stream_type == 'screen') {
        createVideoElement(self, data, self.their_id + '-screen', self.their_name);
        return;
      }
      data.addEventListener('removetrack', (event) => {
        changeStatusOfVideoElement(
          self,
          'video_off',
          data,
          this.their_id + '-video'
        );
      });
      createVideoElement(self, data, self.their_id + '-video', self.their_name);
    });
    peer.on('data', (data) => {
      // Check if this is waiting to handle any stream.
      if (data == 'screen- go ahead') {
        //Handshake complete share screen
        this.peer.addStream(this.stream_to_be_sent);
      }
      if (data == 'stop screen sharing') {
        deleteVideoElement(this.their_id + '-screen');
      }
      if (this.sharing == 0) {
        if (data == 'sharing screen') {
          this.sharing = 1;
          this.next_stream_type = 'screen';
          this.peer.send('screen- go ahead');
        }
      }
    });
  }

  async close() {
    this.peer.destroy();
    deleteVideoElement(this.their_id + '-video');
    deleteVideoElement(this.their_id + '-screen');
    if (this.num_retries == null) {
      return;
    }
    const self = this;
    if (this.ended) {
      this.connected = false;
    } else {
      console.log(this.num_retries);
      if (this.num_retries > 3) {
        if (self.stream) {
          self.stream.getTracks().forEach((track) => {
            track.stop();
          });
          self.stream.getTracks().forEach((track) => {
            self.stream.removeTrack(track);
          });
        }
        return;
      }
      if (this.num_retries >= 1) {
        if (self.stream) {
          self.stream.getTracks().forEach((track) => {
            track.stop();
          });
          self.stream.getTracks().forEach((track) => {
            self.stream.removeTrack(track);
          });
        }
      }
      //Trying to reconnect.
      if (this.type == 'video') {
        await navigator.mediaDevices
          .getUserMedia({
            video: videoQuality[this.num_retries],
            audio: { echoCancellation: true, noiseSuppression: true }
          })
          .then((media) => {
            self.num_retries = self.num_retries + 1;
            self.stream = media;
            var retrytime = Math.floor(Math.random() * 5000) + 1;
            self.peer = new SimplePeer({
              initiator: self.initiator,
              stream: self.stream,
              sdpTransform: (sdp) => {
                let newSDP = sdp;
                newSDP = setMediaBitrate(newSDP, 'video', 233);
                newSDP = setMediaBitrate(newSDP, 'audio', 80);
                return newSDP;
              },
              config: {
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'HWeF3pu@u2RfeYD',
                    username: 'veddandekar6@gmail.com'
                  }
                ]
              }
            });

            self.peer.on('error', (err) => {
              self.error = err;
              self.close();
            });

            self.peer.on('close', (_) => {
              self.close();
            });
            self.peer.on('signal', (data) => {
              setTimeout(function () {
                console.log(retrytime);
                retrytime = 0;
                var room = self.room;
                socket.emit(
                  'signalling',
                  room,
                  data,
                  self.their_id,
                  self.my_id,
                  (resp) => {
                    return;
                  }
                );
              }, retrytime);
            });
            self.peer.on('connect', (data) => {
              self.connected = true;
            });
            self.peer.on('stream', (data) => {
              self.sharing = 0;

              // If screen shared is of type screen, don't add handlers
              if (self.next_stream_type == 'screen') {
                createVideoElement(
                  self,
                  data,
                  self.their_id + '-screen',
                  self.their_name
                );
                return;
              }
              data.addEventListener('removetrack', (event) => {
                changeStatusOfVideoElement(
                  self,
                  'video_off',
                  data,
                  self.their_id + '-video'
                );
              });
              createVideoElement(
                self,
                data,
                self.their_id + '-video',
                self.their_name
              );
            });
            self.peer.on('data', (data) => {
              // Check if this is waiting to handle any stream.
              if (data == 'screen- go ahead') {
                //Handshake complete share screen
                self.peer.addStream(self.stream_to_be_sent);
              }
              if (self.sharing == 0) {
                if (data == 'sharing screen') {
                  self.sharing = 1;
                  self.next_stream_type = 'screen';
                  self.peer.send('screen- go ahead');
                }
              }
            });
          });
      } else if (this.type == 'screen') {
        var retrytime = Math.floor(Math.random() * 5000) + 1;
        self.peer = new SimplePeer({
          initiator: self.initiator,
          stream: self.stream,
          sdpTransform: (sdp) => {
            let newSDP = sdp;
            newSDP = setMediaBitrate(newSDP, 'video', 233);
            newSDP = setMediaBitrate(newSDP, 'audio', 80);
            return newSDP;
          },
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              {
                urls: 'turn:numb.viagenie.ca',
                credential: 'HWeF3pu@u2RfeYD',
                username: 'veddandekar6@gmail.com'
              }
            ]
          }
        });

        self.peer.on('error', (err) => {
          self.error = err;
          self.close();
        });

        self.peer.on('close', (_) => {
          self.close();
        });
        self.peer.on('signal', (data) => {
          setTimeout(function () {
            console.log(retrytime);
            retrytime = 0;
            var room = self.room;
            socket.emit(
              'signalling',
              room,
              data,
              self.their_id,
              self.my_id,
              (resp) => {
                return;
              }
            );
          }, retrytime);
        });
        self.peer.on('connect', (data) => {
          self.connected = true;
        });
        self.peer.on('stream', (data) => {
          self.sharing = 0;

          // If screen shared is of type screen, don't add handlers
          if (self.next_stream_type == 'screen') {
            createVideoElement(
              self,
              data,
              self.their_id + '-screen',
              self.their_name
            );
            return;
          }
          data.addEventListener('removetrack', (event) => {
            changeStatusOfVideoElement(
              self,
              'video_off',
              data,
              self.their_id + '-video'
            );
          });
          createVideoElement(self, data, self.their_id + '-video', self.their_name);
        });
        self.peer.on('data', (data) => {
          // Check if this is waiting to handle any stream.
          if (data == 'screen- go ahead') {
            //Handshake complete share screen
            self.peer.addStream(self.stream_to_be_sent);
          }
          if (self.sharing == 0) {
            if (data == 'sharing screen') {
              self.sharing = 1;
              self.next_stream_type = 'screen';
              self.peer.send('screen- go ahead');
            }
          }
        });
      }
    }
  }
}

export async function toggleVideo(self) {
  var webCam = getVideoState();
  navigator.mediaDevices
    .getUserMedia(
      webCam
        ? {
            video: { width: 320, height: 180 },
            audio: { echoCancellation: true, noiseSuppression: true }
          }
        : {
            audio: { echoCancellation: true, noiseSuppression: true }
          }
    )
    .then((stream) => {
      if (myMediaStreamObj.getVideoTracks().length != 0) {
        connectedPeers.map((eachPeer) => {
          try {
            eachPeer.peer.removeTrack(
              myMediaStreamObj.getVideoTracks()[0],
              myMediaStreamObj
            );
          } catch (err) {
            console.log(err);
            //alert('could not share screen to this peer');
          }
        });
        //Remove locally
        myMediaStreamObj.getVideoTracks()[0].stop();
        myMediaStreamObj.removeTrack(myMediaStreamObj.getVideoTracks()[0]);
        changeStatusOfVideoElement(
          self,
          'video_off',
          myMediaStreamObj,
          'me' + '-video'
        );
      }
      if (webCam) {
        if (connectedPeers) {
          connectedPeers.map((eachPeer) => {
            //TODO: REmove previous video tracks if any
            try {
              eachPeer.peer.addTrack(
                stream.getVideoTracks()[0],
                myMediaStreamObj
              );
            } catch (err) {
              console.log(err);
              //alert('could not share screen to this peer');
            }
          });
        }
        myMediaStreamObj.addTrack(stream.getVideoTracks()[0]);
        changeStatusOfVideoElement(
          self,
          'video_on',
          myMediaStreamObj,
          'me' + '-video'
        );
      } /*else {
        if (self.state.myPeers) {
          self.state.myPeers.map((eachPeer) => {
            eachPeer.peer.remove(stream.getVideoTracks()[0], self.state.myMediaStreamObj);
          });
        }
      }*/
    });
}
export async function toggleAudio(self) {
  var mic = getAudioState();

  navigator.mediaDevices
    .getUserMedia({
      video: { width: 320, height: 180 },
      audio: mic ? { echoCancellation: true, noiseSuppression: true } : false
    })
    .then((stream) => {
      if (connectedPeers) {
        connectedPeers.map((eachPeer) => {
          if (myMediaStreamObj.getAudioTracks)
            eachPeer.peer.replaceTrack(
              myMediaStreamObj.getAudioTracks()[0],
              stream.getAudioTracks()[0],
              myMediaStreamObj
            );
        });
        if (myMediaStreamObj.getAudioTracks) {
          myMediaStreamObj.getAudioTracks()[0].stop();
        }
      }
    })
    .catch((err) => console.log(err));
}
function muteVideo(self, id) {
  const userStream = document.getElementById(id).srcObject;
  const deets = document.getElementById(id).nextElementSibling;
  if (userStream.getAudioTracks()[0].enabled) {
    userStream.getAudioTracks()[0].enabled = false;
    // userStream.getVideoTracks()[0].enabled = false;
    deets.children[1].classList.remove('icon-volume-2');
    deets.children[1].classList.add('icon-volume-off');
  } else {
    userStream.getAudioTracks()[0].enabled = true;
    // userStream.getVideoTracks()[0].enabled = true;
    deets.children[1].classList.add('icon-volume-2');
    deets.children[1].classList.remove('icon-volume-off');
  }
}

export function createVideoElement(self, stream, friendtkn, username) {
  const wrapper = document.createElement('div');
  const video = document.createElement('video');
  const row = document.createElement('div');
  row.classList.add('row', 'video-details');
  const nameTag = document.createElement('div');
  const audioIcon = document.createElement('i');
  const context = document.getElementById('context');
  const contextOptions = document.getElementById('contextOptions');
  audioIcon.classList.add('icon-volume-2', 'audio-icon');
  audioIcon.addEventListener('click', () => muteVideo(self, friendtkn));
  if (friendtkn == 'me-video') audioIcon.style.display = 'none';
  nameTag.classList.add('name-label');
  nameTag.innerText = username || 'me';
  video.width = '200';
  video.id = friendtkn;
  video.height = '350';
  video.srcObject = stream;
  video.autoplay = true;
  video.onclick = switchContext;
  if (video.id == 'me-video') {
    video.muted = 'true';
  }
  wrapper.appendChild(video);
  row.appendChild(nameTag);
  row.appendChild(audioIcon);
  wrapper.appendChild(row);
  document.getElementById('videos').appendChild(wrapper);
  contextOptions.style.display = 'inline-flex';
  if (!context.srcObject) switchContext(document.getElementById(friendtkn));
}

function changeStatusOfVideoElement(
  self,
  status,
  stream,
  friendtkn,
  username = null
) {
  //let video = $('#' + friendtkn);
  if (status == 'video_off') {
    const video = document.getElementById(friendtkn);
    if (!video) {
      return;
    }
    video.srcObject = stream;
    video.poster =
      'https://dummyimage.com/1024x576/2f353a/ffffff.jpg&text=' + username;
    video.play();
  } else if (status == 'video_on') {
    const video = document.getElementById(friendtkn);
    if (!video) {
      return;
    }
    video.srcObject = stream;
    video.play();
  }
}

export function switchContext(e) {
  if (e.target) e = e.target;
  try {
    const context = document.getElementById('context');
    if (e.srcObject == context.srcObject) return;
    const username = e.nextElementSibling.innerText;
    context.style.display = 'inline';
    context.poster =
      'https://dummyimage.com/1024x576/2f353a/ffffff.jpg&text=' + username;
    context.srcObject = e.srcObject;
    if (e.id == 'me-video') {
      context.muted = 'true';
    }
    context.play();
    $('#context').removeClass().addClass(e.id);
  } catch (err) {
    console.log(err);
  }
}

export async function changeCameraFacing(self, facing) {
  navigator.mediaDevices
    .getUserMedia({
      video: { facingMode: facing, width: 320, height: 180 },
      audio: { echoCancellation: true, noiseSuppression: true }
    })
    .then((stream) => {
      connectedPeers.map((eachPeer) => {
        eachPeer.peer.replaceTrack(
          myMediaStreamObj.getVideoTracks()[0],
          stream.getVideoTracks()[0],
          myMediaStreamObj
        );
        deleteVideoElement('me' + '-video');
        createVideoElement(self, stream, 'me' + '-video');
      });
      myMediaStreamObj.getVideoTracks()[0].stop();
    });
}

export async function getMyMediaStream(self, type, quality_index) {
  if (quality_index == null) {
    quality_index = 0;
  }
  if (type === 'screen') {
    // TODO: Add try catch to handle case when user denies access
    await navigator.mediaDevices
      .getDisplayMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })
      .then((media) => {
        myScreenStreamObj = media;
        createVideoElement(self, media, 'me' + '-screen');
        return media;
      });
  } else if (type === 'video') {
    // TODO: Add try catch to handle case when user denies access

    await navigator.mediaDevices
      .getUserMedia(
        // webCam
        //   ?
        {
          video: videoQuality[quality_index],
          audio: { echoCancellation: true, noiseSuppression: true }
        }
        // : {
        //     audio: { echoCancellation: true, noiseSuppression: true }
        //   }
      )
      .then((media) => {
        myMediaStreamObj = media
        createVideoElement(self, media, 'me' + '-video');
        return media;
      });
    // alert(self.state.myMediaStreamObj);
  }
}
export function startCall(self, roomName, type) {
  /* Initialize connectedPeers to empty array */ 
  connectedPeers = [];

  /* create a socket to handle configuration messages. */
  socket.connect();
  console.log(socket.id);
  socket.on('connect', () => {
    createConnections(self, roomName, type);
  });
  socket.on('signalling', (data, from_id) => {
    /*
    if (from_id != this.their_id) {
      return;
    }
    if (this.peer && !this.peer.destroyed) {
      this.peer.signal(data);
    }
    */
    connectedPeers.forEach((val) => {
      if(val.their_id == from_id) {
        val.peer.signal(data);
      }
    });
  });
}

function createConnections(self, roomName, type) {
  var my_id = socket.id;
  console.log(socket.id);
  // Go online and get online array from express server.
  var reqData = {
    id: my_id,
    type: 0,
    roomName: roomName
  };
  axios
    .post(`${global.config.backendURL}/api/room/goonlinesimple`, reqData, {
      headers: {
        'milaap-auth-token': localStorage.getItem('milaap-auth-token')
      }
    })
    .then((res) => {
      var onlineArray = res.data.online;
      // Get myMyMediaStream
      getMyMediaStream(self, type).then((media) => {
        // Add eventhandler for "createConnection" signal, On receiving the signal:
        connectedPeers = [];
        socket.on('startconn', (their_id, their_name) => {
          //Remove previous connections with their_id
          //FACT: Comment this part to test reconnection.
          connectedPeers.forEach((val, index) => {
            if (val && val.their_id == their_id) {
              val.ended = true;
              val.peer.destroy('Call Ended');
            }
          });
          var my_id = socket.id;
          var mediaStream;
          if (type == 'video') {
            mediaStream = myMediaStreamObj;
          } else if (type == 'screen') {
            mediaStream = myScreenStreamObj;
          } else {
            mediaStream = null;
          }
          // Create a new peer with initiator = false
          var peer = new Peer(
            mediaStream,
            self.state.roomName,
            false,
            their_id,
            their_name,
            my_id,
            type
          );
          connectedPeers.push(peer);
        });

        axios
          .get(`${global.config.backendURL}/api/user/getUserName`, {
            headers: {
              'milaap-auth-token': localStorage.getItem('milaap-auth-token')
            }
          })
          .then((resp) => {
            // Loop through online Array and make connections to online Peers
            console.log(onlineArray);
            onlineArray.forEach((val, index) => {
              // Ignore self;
              if (val.username === resp.data.username /*&& val.type === type*/) {
                return;
              }
              var their_id = onlineArray[index].id;
              var their_name = onlineArray[index].username;
              var my_name = resp.data.username;
              var my_id = socket.id;
              console.log(their_id, my_id, my_name);
              socket.emit('startconn', their_id, my_id, my_name, (resp) => {
                var my_id = socket.id;
                //var peer = new Peer(true, self.state.myMediaStreamObj, self.state.roomName, true, their_id, my_id);
              });
              var mediaStream;
              if (type == 'video') {
                mediaStream = myMediaStreamObj;
              } else if (type == 'screen') {
                mediaStream = myScreenStreamObj;
              } else {
                mediaStream = null;
              }
              var my_id = socket.id;
              //    create a new Peer with initiator = true
              var peer = new Peer(
                mediaStream,
                self.state.roomName,
                true,
                their_id,
                their_name,
                my_id,
                type
              );
              connectedPeers.push(peer);
            });
          });
      });
    })
    .catch((err) => {
      console.log(err);
    });
}
function sendRequestToEndCall(self) {
  const reqData = {
    roomName: self.state.roomName
  };
  axios
    .post(`${global.config.backendURL}/api/room/exitstreamsimple`, reqData, {
      headers: {
        'milaap-auth-token': localStorage.getItem('milaap-auth-token')
      }
    })
    .then((res) => {
      console.log('exited');
      return;
    })
    .catch((err) => {
      console.log(err);
      return;
    });
    connectedPeers.forEach((val, index) => {
      if (val) {
        val.ended = true;
        val.peer.destroy('Call Ended');
      }
    });
    // Clear all state variables associated with calls.
    connectedPeers = [];
}
export async function endCall(self) {
  await sendRequestToEndCall(self);
  if (myMediaStreamObj) {
    myMediaStreamObj.getTracks().forEach((track) => {
      track.stop();
    });
    myMediaStreamObj.getTracks().forEach((track) => {
      myMediaStreamObj.removeTrack(track);
    });
    myMediaStreamObj = new MediaStream();
  }
  if (myScreenStreamObj) {
    myScreenStreamObj.getTracks().forEach((track) => {
      track.stop();
    });
    myScreenStreamObj.getTracks().forEach((track) => {
      myScreenStreamObj.removeTrack(track);
    });
    myScreenStreamObj = new MediaStream();
  }
  // Add by appropriate UI changes which clears the screen.
  deleteAllVideoElements();

  /* Delete the current socket connection. */
  socket.close();
}

function deleteAllVideoElements() {
  $('#videos').empty();
  const contextOptions = document.getElementById('contextOptions');
  if (contextOptions) contextOptions.style.display = 'none';
  clearContext();
}

function clearContext() {
  const context = document.getElementById('context');
  if (context != null) {
    context.srcObject = null;
    context.style.display = 'none';
  }
}
function deleteVideoElement(id) {
  const video = document.getElementById(id);
  const context = $('#context');
  if (video) {
    video.nextElementSibling.remove();
    video.remove();
  }
  if (context.hasClass(id)) {
    clearContext();
  }
}

export async function addScreenShareStream(self) {
  getMyMediaStream(self, 'screen').then((media) => {
   connectedPeers.forEach((val, index) => {
      // send request to share screen. Reply for this
      // handled in peer.on('data') eventHandler.
      if (val.peer && !val.peer.destroyed && val.connected) {
        try {
          val.peer.send('sharing screen');
          val.stream_to_be_sent = myScreenStreamObj;
        } catch (err) {
          console.log(err);
          //alert('could not share screen to this peer');
        }
      }
      //val.peer.addStream(self.state.myScreenStreamObj);
    });
  });
}

export async function stopScreenShare(self) {
  connectedPeers.forEach((val, index) => {
    // send request to share screen. Reply for this
    // handled in peer.on('data') eventHandler.
    if (val.peer && !val.peer.destroyed && val.connected) {
      try {
        val.peer.removeStream(myScreenStreamObj);
        val.peer.send('stop screen sharing');
      } catch (err) {
        console.log(err);
        //alert('could not share screen to this peer');
      }
    }
  });
  if (myScreenStreamObj) {
    myScreenStreamObj.getTracks().forEach((track) => {
      track.stop();
    });
    myScreenStreamObj.getTracks().forEach((track) => {
      myScreenStreamObj.removeTrack(track);
    });
    myScreenStreamObj = MediaStream();
    deleteVideoElement('me-screen');
  }
}

function setMediaBitrate(sdp, media, bitrate) {
  let lines = sdp.split('\n');
  let line = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('m=' + media) === 0) {
      line = i;
      break;
    }
  }
  if (line === -1) {
    // log('Could not find the m line for', media)
    return sdp;
  }
  // log('Found the m line for', media, 'at line', line)

  // Pass the m line
  line++;

  // Skip i and c lines
  while (lines[line].indexOf('i=') === 0 || lines[line].indexOf('c=') === 0) {
    line++;
  }

  // If we're on a b line, replace it
  if (lines[line].indexOf('b') === 0) {
    // log('Replaced b line at line', line)
    lines[line] = 'b=AS:' + bitrate;
    return lines.join('\n');
  }

  // Add a new b line
  // log('Adding new b line before line', line)
  let newLines = lines.slice(0, line);
  newLines.push('b=AS:' + bitrate);
  newLines = newLines.concat(lines.slice(line, lines.length));
  return newLines.join('\n');
}

import React, { Component } from 'react';
import { Nav, NavItem, NavLink, Progress, TabContent, TabPane, ListGroup, ListGroupItem } from 'reactstrap';
import classNames from 'classnames';
import { AppSwitch } from '@coreui/react'
import MessageView from '../../views/MessageList/index';
import { Jumbotron, Button, ButtonGroup, Badge, Card, CardBody, CardFooter, CardHeader, Col, Container, Row, Collapse, Fade } from 'reactstrap';
import Peer from "peerjs";
import axios from 'axios';

class Controls extends Component {

  constructor(props) {
    super(props);
    console.log(props);
    this.state = {
            roomName: this.props.roomName,
            remotePeers: new Array(),
            remotePeersID: new Array(),
            calls: new Array(),
            opinfo: '',
            friendtkn: '',
    };
    this.startVideo = this.startVideo.bind(this);
    this.startScreenShare = this.startScreenShare.bind(this);
  }

  componentDidUpdate(prevProps) {
      if(this.props.roomName != prevProps.roomName) {
          this.setState({
              roomName: this.props.roomName
          });
      }
  }

  switchContext = (e) => {
    let context = document.getElementById("context");
    context.srcObject = e.target.srcObject;
    context.play();
  };
  
  async startScreenShare() {
        const self = this;
        console.log(this.state.roomName);
        self.setState({
                opinfo: 'getting token'
        });
        var tkn;
        var peer = new Peer({
                config: {
                  iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    {
                      url: "turn:numb.viagenie.ca",
                      credential: "HWeF3pu@u2RfeYD",
                      username: "veddandekar6@gmail.com",
                    },
                  ],
                } /* Sample servers, please use appropriate ones */,
        });
        await peer.on('open', function(id) {
                tkn = id;
                console.log(id);
                self.setState({
                        opinfo: 'token rcvd:- ' + tkn 
                });
                const reqData = {
                        roomName: self.state.roomName,
                        tkn: tkn,
                        username: localStorage.getItem('uname')
                };
                console.log(reqData);
                //Send the generated token to express server
                axios.post('http://localhost:5000/api/room/goonline',
                        reqData)
                        .then(res => {
                                console.log(res);
                                if(res.data.connected == 1) {
                                        peer.on('call', function(call) {
                                            navigator.mediaDevices
                                              .getDisplayMedia({
                                                video: { width: 1024, height: 576 },
                                                audio: true,
                                              })
                                              .then((media) => {
                                                      call.answer(media);
                                                      call.on("error", (err) => console.log(err));
                                                      call.on("stream", function (stream) {
                                                        let video = document.createElement("video");
                                                        video.width = "200";
                                                        video.height = "350";
                                                        video.srcObject = stream;
                                                        video.autoplay = true;
                                                        video.onclick = self.switchContext;
                                                        document.getElementById("videos").appendChild(video);
                                                      });
                                                      self.setState({
                                                        calls: [...self.state.calls, call],
                                                      });
                                              });
                                        });
                                } else if(res.data.connected > 1) {
                                        let onlineArray = res.data.online;
                                        var connIndex = -1;
                                        onlineArray.forEach((val, index) => {
                                                if(val.username == localStorage.getItem("uname")) {
                                                        //connIndex = index;
                                                        return;
                                                }
                                                var friendtkn = onlineArray[index].tkn;
                                                console.log(friendtkn);
                                                navigator.mediaDevices
                                                     .getDisplayMedia({
                                                        video: { width: 1024, height: 576 },
                                                        audio: true,
                                                      })
                                                      .then((media) => {
                                                        var thiscall = peer.call(friendtkn, media);
                                                        self.setState(
                                                          {
                                                            //call: peer.call(friendtkn, media),//to be updated appropriately
                                                            calls: [...self.state.calls, thiscall],
                                                          },
                                                          () => {
                                                            thiscall.on("error", (err) => console.log(err));
                                                            thiscall.on("stream", function (stream) {
                                                                let video = document.createElement("video");
                                                                video.width = "200";
                                                                video.height = "350";
                                                                video.srcObject = stream;
                                                                video.autoplay = true;
                                                                video.onclick = self.switchContext;
                                                                document.getElementById("videos").appendChild(video);
                                                              //self.videoRef.current.srcObject = stream;
                                                            });
                                                          }
                                                        );
                                                });
                                        });
                                }
                        }).catch(err => {
                                console.log(err);
                        });
        });
        return;
  }
  async startVideo() {
        const self = this;
        console.log(this.state.roomName);
        self.setState({
                opinfo: 'getting token'
        });
        var tkn;
        var peer = new Peer({
                config: {
                  iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    {
                      url: "turn:numb.viagenie.ca",
                      credential: "HWeF3pu@u2RfeYD",
                      username: "veddandekar6@gmail.com",
                    },
                  ],
                } /* Sample servers, please use appropriate ones */,
        });
        await peer.on('open', function(id) {
                tkn = id;
                console.log(id);
                self.setState({
                        opinfo: 'token rcvd:- ' + tkn 
                });
                const reqData = {
                        roomName: self.state.roomName,
                        tkn: tkn,
                        username: localStorage.getItem('uname')
                };
                console.log(reqData);
                //Send the generated token to express server
                axios.post('http://localhost:5000/api/room/goonline',
                        reqData)
                        .then(res => {
                                console.log(res);
                                if(res.data.connected == 1) {
                                        peer.on('call', function(call) {
                                            navigator.mediaDevices
                                              .getUserMedia({
                                                video: { width: 1024, height: 576 },
                                                audio: true,
                                              })
                                              .then((media) => {
                                                      call.answer(media);
                                                      call.on("error", (err) => console.log(err));
                                                      call.on("stream", function (stream) {
                                                        let video = document.createElement("video");
                                                        video.width = "200";
                                                        video.height = "350";
                                                        video.srcObject = stream;
                                                        video.autoplay = true;
                                                        video.onclick = self.switchContext;
                                                        document.getElementById("videos").appendChild(video);
                                                      });
                                                      self.setState({
                                                        calls: [...self.state.calls, call],
                                                      });
                                              });
                                        });
                                } else if(res.data.connected > 1) {
                                        let onlineArray = res.data.online;
                                        var connIndex = -1;
                                        onlineArray.forEach((val, index) => {
                                                if(val.username == localStorage.getItem("uname")) {
                                                        //connIndex = index;
                                                        return;
                                                }
                                                var friendtkn = onlineArray[index].tkn;
                                                console.log(friendtkn);
                                                navigator.mediaDevices
                                                     .getUserMedia({
                                                        video: { width: 1024, height: 576 },
                                                        audio: true,
                                                      })
                                                      .then((media) => {
                                                        var thiscall = peer.call(friendtkn, media);
                                                        self.setState(
                                                          {
                                                            //call: peer.call(friendtkn, media),//to be updated appropriately
                                                            calls: [...self.state.calls, thiscall],
                                                          },
                                                          () => {
                                                            thiscall.on("error", (err) => console.log(err));
                                                            thiscall.on("stream", function (stream) {
                                                                let video = document.createElement("video");
                                                                video.width = "200";
                                                                video.height = "350";
                                                                video.srcObject = stream;
                                                                video.autoplay = true;
                                                                video.onclick = self.switchContext;
                                                                document.getElementById("videos").appendChild(video);
                                                              //self.videoRef.current.srcObject = stream;
                                                            });
                                                          }
                                                        );
                                                });
                                        });
                                }
                        }).catch(err => {
                                console.log(err);
                        });
        });
        return;
  }

  render() {

    // eslint-disable-next-line
    return (
                  <Container>
                  <Row>
                          <Col className='col'></Col>
                          <Col className='col auto'>
                            <h1>Join Video </h1>
                          </Col>
                          <Col className='col'></Col>
                  </Row>
                  <Row>
                          <Col className='col-sm'></Col>
                          <Col className='col-sm'>
                <ButtonGroup>
                  <Button className='btn btn-info' onClick={this.startScreenShare}>Screen</Button>
                  <Button className='btn btn-success' onClick={this.startVideo}>Video</Button>
                </ButtonGroup>
                          </Col>
                          <Col className='col-sm'></Col>
                  </Row>
                  <Row>
                          <p>{this.state.opinfo}</p>
                  </Row>

                  </Container>
    );
  }
}

export default Controls;

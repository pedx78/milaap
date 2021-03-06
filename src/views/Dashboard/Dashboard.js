import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';
import {
  Button,
  Form,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Container,
  Row,
  Col
} from 'reactstrap';

import { connect } from 'react-redux';
import logo from '../../assets/img/brand/logo.png';
import PropTypes from 'prop-types';
import axios from 'axios';

const propTypes = {
  children: PropTypes.node
};

const defaultProps = {};

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      friendid: '',
      roomName: ''
    };
  }

  addFriend = async () => {
    const reqData = {
      user: this.state.friendid,
      roomName: this.state.roomName
    };
    try {
      await axios.post(`${global.config.backendURL}/api/room/createroom`, reqData, {
        headers: {
          'milaap-auth-token': localStorage.getItem('milaap-auth-token')
        }
      });
      this.toggle();
      /* TODO: Replace with appropriate state handling, to add room without reloading. */
      // window.location.reload();
    } catch (err) {
      /* TODO: Appropriate Error handling. */
      alert('Room exists, try a different room');
    }
  };

  handleFriendChange = (e) => {
    this.setState({
      friendid: e.target.value
    });
  };

  handleRoomNameChange = (e) => {
    this.setState({
      roomName: e.target.value
    });
  };

  toggle = () => {
    this.setState({
      modal: !this.state.modal
    });
  };

  loading = () => <div className="animated fadeIn pt-1 text-center">Loading...</div>;

  render() {
    if (this.props.username === false) {
      return <Redirect to="/login" />;
    }
    return (
      <>
        <div className="text-center">
          <center>
            <br />
            <br />
            <h1 style={{ color: 'white', opacity: '0.5' }}>
              {`Welcome to Milaap, ${this.props.username}!`}
            </h1>
            <br />
            <Container>
              <Row className="justify-content-center">
                <Col></Col>
                <Col className="justify-content-center">
                  {this.props.guests &&
                    !this.props.guests.includes(this.props.username) && (
                      <button
                        type="button"
                        className="btn btn-pill btn-secondary"
                        onClick={this.toggle}>
                        Create Room
                      </button>
                    )}
                </Col>
                <Col className="justify-content-center">
                  <button
                    type="button"
                    className="btn btn-pill btn-secondary"
                    onClick={() => {
                      this.props.history.push('/join');
                    }}>
                    Join Room
                  </button>
                </Col>
                <Col></Col>
              </Row>
              <br />
              <br />
              <Row
                className="justify-content-center"
                style={{ opacity: '0.5' }}
                /*style={{
                  margin: '0%',
                  height: '25%',
                  padding: '0',
                  opacity: '0.5'
                }}*/
              >
                <img
                  src={logo}
                  onClick={() => this.props.history.push('dashboard')}
                  width="30%"
                  height="21.7%"
                  style={{ cursor: 'pointer' }}
                  alt="milaap logo"
                />

                {/* 
                <Card
                  className="text-white bg-transparent py-5 d-md-down"
                  /*style={{ width: '80%' }}
                  style={{
                    backgroundColor: 'transparent',
                    border: 0,
                    padding: '0'
                  }}
                >
                  <CardBody
                    className="text-center"
                    /*style={{
                      backgroundColor: 'transparent',
                      border: 0,
                      padding: '0'
                    }}
                  >
                    <img
                      src={logo}
                      onClick={() => this.props.history.push('dashboard')}
                      style={{ cursor: 'pointer' }}
                    />
                  </CardBody>
                </Card>
              */}
              </Row>
            </Container>
            <br />
            <h4 style={{ color: 'white', opacity: '0.5' }}>
              1. To create a room, click on 'Create Room', at the top
            </h4>
            <br />
            <h4 style={{ color: 'white', opacity: '0.5' }}>
              2. To join a room as a guest, click on 'Join Room', at the top
            </h4>
            <br />
            <h4 style={{ color: 'white', opacity: '0.5' }}>
              3. To join a room as an admin, click on the room to enter, visible on
              your left
            </h4>
          </center>
        </div>
        <Modal
          isOpen={this.state.modal}
          toggle={this.toggle}
          className={this.props.className}>
          <ModalHeader toggle={this.toggle}>Create Room</ModalHeader>
          <ModalBody>
            <Form>
              <InputGroup className="mb-3">
                <InputGroupAddon addonType="prepend">
                  <InputGroupText>
                    <i className="icon-user"></i>
                  </InputGroupText>
                </InputGroupAddon>
                <Input
                  type="text"
                  placeholder="Room Name"
                  autoComplete="roomname"
                  value={this.state.roomName}
                  onChange={this.handleRoomNameChange}
                />
              </InputGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.addFriend}>
              Add
            </Button>{' '}
            <Button color="secondary" onClick={this.toggle}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      </>
    );
  }
}

Dashboard.propTypes = propTypes;
Dashboard.defaultProps = defaultProps;

const mapStateToProps = (state) => ({
  username: state.loginReducer.username,
  guests: state.roomReducer.guests
});

export default connect(mapStateToProps)(Dashboard);

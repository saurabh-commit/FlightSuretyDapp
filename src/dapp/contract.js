import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';

import Config from './config.json';
import Web3 from 'web3';

// let STATUS_CODE_LATE_AIRLINE = 20;
export default class Contract {
    

    constructor(network, callback) {
        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        // this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            this.owner = accts[0];
            let counter = 1;
            while (this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }
            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }
            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({
                from: self.owner
            }, callback);
    }

    isAirlineRegistered(airlineAddress, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isAirlineRegistered(airlineAddress)
            .call({
                from: self.owner
            }, callback);
    }

    isAirlineFunded(airlineAddress, callback) {
        let self = this;
        self.flightSuretyData.methods
            .isAirlineFunded(airlineAddress)
            .call({
                from: self.owner
            }, callback);
    }

    registerAirline(airlineAddress, fromAccount, flight, callback) {
        let self = this;
        console.log("registerAirline: airlineAddress---"+airlineAddress+" fromAccount: "+fromAccount +" flight: " + flight)
        self.flightSuretyApp.methods
            .registerAirline(airlineAddress, flight)
            .send({
                from: fromAccount,
                gas: 4000000,
                gasPrice: 100000000000
            }, callback);
    }

    fund(airlineAddress, callback) {
        let self = this;
        console.log("contract fund, airline: " + airlineAddress);
        self.flightSuretyApp.methods
            .fund()
            .send({
                from: airlineAddress,
                value: this.web3.utils.toWei("10", "ether"),
                gas: 4000000,
                gasPrice: 100000000000
            }, callback);
    }

    buy(passengerAccount, airlineAddress, flight, timestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .buyInsurance(airlineAddress, flight, timestamp)
            .send({
                from: passengerAccount,
                value: this.web3.utils.toWei("1", "ether"),
                gas: 4000000,
                gasPrice: 100000000000
            }, callback);

    }

    registerFlight(airlineAddress, flight, timestamp, callback) {
        let self = this
        self.flightSuretyApp.methods
            .registerFlight(flight, timestamp)
            .send({
                from: airlineAddress,
                gas: 4000000,
                gasPrice: 100000000000
            }, callback);
    }

    fetchFlightStatus(airlineAddress, flight, timestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .fetchFlightStatus(airlineAddress, flight, timestamp)
            .send({
                from: self.owner
            }, (error, result) => {
                callback(error, result);
            });
    }

    async accountBalance(account) {
        let balance = await this.web3.eth.getBalance(account);
        return await this.web3.utils.fromWei(balance);
    }

    submitOracleResponse(index, airlineAddress, flight, timestamp, status_code) {
        let self = this;
        self.flightSuretyApp.methods
            .submitOracleResponse(index, airlineAddress, flight, timestamp, status_code)
            .send({
                from: self.owner 
            });
    }

    // processFlightStatus(passengerAccount, airlineAddress, flight, timestamp, callback) {
    //     let self = this;
    //     self.flightSuretyApp.methods
    //         .processFlightStatus(airlineAddress, flight, timestamp, STATUS_CODE_LATE_AIRLINE)
    //         .send({
    //             from: passengerAccount
    //     }, callback);
    // }

    // claim(passengerAccount, airlineAddress, flight, timestamp, callback) {
    //     let self = this;
    //     self.flightSuretyApp.methods
    //         .claimCredit(airlineAddress, flight, timestamp)
    //         .send({
    //             from: passengerAccount
    //         }, callback);
    // }

    pay(passengerAccount, airlineAddress, flight, timestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .withdrawCredits()
            .send({
                from: passengerAccount
            }, callback);
    }

}
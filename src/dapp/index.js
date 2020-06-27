import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async () => {

    let result = null;
    var Web3 = require("web3");
    var date = new Date();
    let registeredAirlines = [];
    let authorizedAccounts = [];
    let oracleKey;

    let contract = new Contract('localhost', () => {

        let flightsName = ['BC001', 'AD001', 'BC058', 'AD058', 'AD019'];
        let flights = {
            'BC001': [date.getTime() + 1001, contract.airlines[0]],
            'AD001': [date.getTime() + 2001, contract.airlines[1]],
            'BC058': [date.getTime() + 3058, contract.airlines[2]],
            'AD058': [date.getTime() + 4058, contract.airlines[3]],
            'AD019': [date.getTime() + 5029, contract.airlines[4]]
        }

        // Read transaction
        contract.isOperational((error, result) => {
            display('Operational Status', 'Check if contract is operational', [{
                label: 'Operational Status',
                error: error,
                value: result
            }]);
        });

        // Initialize accounts list
        // authorizedAccounts.push(contract.owner);
        // authorizedAccounts.push(contract.airlines[0]);
        // var optionsAccount = contract.airlines;
        updateSelectList('selectAirline', contract.airlines);
        // updateSelectList('selectAccount', authorizedAccounts);
        updateSelectList('populateFlights', Object.keys(flights));

        console.log("selectAirline: " + selectAirline + " selectAccount: " + selectAccount + "  populateFlights: " + populateFlights)
        let flightID = populateFlights.options[populateFlights.selectedIndex].value;
        const flightTime = document.querySelector('.flight-time');
        const flightAirline = document.querySelector('.flight-airline');
        flightTime.textContent = "Flight Time: " + flights[flightID][0];
        flightAirline.textContent = "Airline: " + flights[flightID][1];
        updateSelectList('passengerList', contract.passengers);
        updateSelectList('passengerList2', contract.passengers);
        populateRegistered(contract.airlines, contract);

        DOM.elid('register-airline').addEventListener('click', async () => {
            let caller = selectAccount.options[selectAccount.selectedIndex].value;
            let airline = selectAirline.options[selectAirline.selectedIndex].value;
            let airlineName = flightsName[selectAirline.selectedIndex];
            contract.registerAirline(airline, caller, airlineName, (error, result) => {
                console.log("register-airline event: calling populateRegistered: airlines: " + contract.airlines + " result: " + result)
                populateRegistered(contract.airlines, contract);
            });
        });

        DOM.elid('populate-registered').addEventListener('click', () => {
            populateRegistered(contract.airlines, contract);
        });

        DOM.elid('fund-airline').addEventListener('click', () => {
            const registered = DOM.elid('populateRegistered');
            let airline = registered.options[registered.selectedIndex].value;
            console.log(airline);
            contract.fund(airline, (error, result) => {
                console.log("fund-airline: " + result)
                console.log(result)
            });
        });

        DOM.elid('populate-funded').addEventListener('click', () => {
            console.log("calling populateFunded, constract.airlines: " + contract.airlines)
            populateFunded(contract.airlines, contract);
        });

        DOM.elid('populateFlights').addEventListener('change', () => {
            let flightID = populateFlights.options[populateFlights.selectedIndex].value;
            const flightTime = document.querySelector('.flight-time');
            const flightAirline = document.querySelector('.flight-airline');
            flightTime.textContent = "Flight Time: " + flights[flightID][0];
            flightAirline.textContent = "Airline: " + flights[flightID][1];
        });

        DOM.elid('register-flight').addEventListener('click', () => {
            let flightCode = populateFlights.options[populateFlights.selectedIndex].value;
            let airline = flights[flightCode][1];
            let timestamp = flights[flightCode][0];
            console.log("Registering flight: " + flightCode + " " + airline + " " + timestamp);
            contract.registerFlight(airline, flightCode, timestamp, (error, result) => {
                console.log(error);
            });
        });

        DOM.elid('buy-insurance').addEventListener('click', () => {
            let flightCode = populateFlights.options[populateFlights.selectedIndex].value;
            let airline = flights[flightCode][1];
            let timestamp = flights[flightCode][0];
            let passenger = passengerList.options[passengerList.selectedIndex].value;
            contract.buy(passenger, airline, flightCode, timestamp, (error, result) => {
                console.log(error);
            });
        });

        // User-submitted transaction
        DOM.elid('submit-oracles').addEventListener('click', () => {
            let flightCode = populateFlights.options[populateFlights.selectedIndex].value;
            let airline = flights[flightCode][1];
            let timestamp = flights[flightCode][0];
            // Write transaction
            contract.fetchFlightStatus(airline, flightCode, timestamp, (error, result) => {
                console.log(error);
                console.log(result);
                oracleKey = result;
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: flightCode + ' ' + timestamp + ' ' + result} ]);
            });
        });

        DOM.elid('check-balance').addEventListener('click', async () => {
            let acc = passengerList2.options[passengerList2.selectedIndex].value;
            let balance = await contract.accountBalance(acc);
            let displayDiv = DOM.elid("display-balance");
            // First clear 
            displayDiv.innerHTML = '';
            let section = DOM.section();
            section.appendChild(DOM.h5('Balance of passenger ' + acc + ' : ' + balance + ' ETH'));
            displayDiv.append(section);
        });

        // DOM.elid('claim-credits').addEventListener('click', async () => {
        //     let acc = passengerList2.options[passengerList2.selectedIndex].value;
        //     let flightCode = populateFlights.options[populateFlights.selectedIndex].value;
        //     let airline = flights[flightCode][1];
        //     let timestamp = flights[flightCode][0];
        //     contract.processFlightStatus(acc, airline, flightCode, timestamp, (error, result) => {
        //         console.log("flightStatus: "+ result);
        //     });
        //     contract.claim(acc, airline, flightCode, timestamp, (error, result) => {
        //         console.log("claimStatus" + result);
        //     });
        // });

        DOM.elid('withdraw-credits').addEventListener('click', async () => {
            let acc = passengerList2.options[passengerList2.selectedIndex].value;
            let flightCode = populateFlights.options[populateFlights.selectedIndex].value;
            let airline = flights[flightCode][1];
            let timestamp = flights[flightCode][0];
            contract.pay(acc, airline, flightCode, timestamp, (error, result) => {
                console.log(error);
            })
        });

    });

})();

// Updates select list elements
function updateSelectList(selectId, listElements) {
    var selectList = DOM.elid(selectId);
    console.log("updateSelectList: " + selectId + " list: "+listElements)
    for (var i = 0; i < listElements.length; i++) {
        var opt = listElements[i];
        console.log("updateSelectList: " + selectId + " list: "+listElements + " opt: " + opt)
        var el = document.createElement("option");
        el.textContent = opt;
        el.value = opt;
        selectList.appendChild(el);
    }
}

// empty data in a list
function clearSelectList(selectId) {
    var selectList = DOM.elid(selectId);
    console.log("clearSelectList: "+ selectId)
    selectList.innerHTML = '';
}


// Updates list elements
function updateList(listId, listItem) {
    var registeredList = DOM.elid(listId);
    var el = document.createElement("li");
    el.textContent = listItem;
    registeredList.appendChild(el);
}

// get registered airlines
async function populateRegistered(array, contract) {
    console.log("populateRegistered calling clearSelecList for populateRegistered")
    clearSelectList('populateRegistered');
    console.log("populateRegistered calling clearSelecList for selectAccount")
    clearSelectList('selectAccount');
    for (const item of array) {
        await contract.isAirlineRegistered(item, (error, result) => {
            if (result) {
                console.log("populateRegistered calling updateSelecList for populateRegistered, item: " + item) 
                updateSelectList('populateRegistered', [item])
                console.log("populateRegistered calling updateSelecList for selectAccount, item: " + item)
                updateSelectList('selectAccount', [item]);
                // console.log("populateRegistered: " + item);
            }
        });
    }
}

// get funded airlines
async function populateFunded(array, contract) {
    console.log("populateRegistered calling clearSelecList for populateFunded")
    clearSelectList('populateFunded');
    for (const item of array) {
        await contract.isAirlineFunded(item, (error, result) => {
            if (result) {
                console.log("populateFunded calling updateSelecList for populateFunded, item: " + item)
                updateSelectList('populateFunded', [item])
            }
        });
    }
}

// display info
function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({
            className: 'row'
        }));
        row.appendChild(DOM.div({
            className: 'col-sm-4 field'
        }, result.label));
        row.appendChild(DOM.div({
            className: 'col-sm-8 field-value'
        }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}
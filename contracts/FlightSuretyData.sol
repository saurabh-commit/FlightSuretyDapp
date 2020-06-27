pragma solidity ^ 0.5 .8;

// import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => bool) private authorizedCallers;

    struct Airline {
        address airlineAddress;
        string name;
        bool isRegistered;
        bool isFunded;
        uint256 fund;
    }
    mapping(address => Airline) private airlines;

    uint256 internal airlineCount = 0;

    struct Insurance {
        address payable insuree;
        uint256 amount;
        address airlineAddress;
        string flight;
        uint256 timeStamp;
    }

    mapping(bytes32 => Insurance[]) private insurances;
    mapping(bytes32 => bool) private insuranceCredited;
    mapping(address => uint256) private creditToInsuree;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                (
                    address airlineAddress,
                    string memory flight
                ) 
                public 
    {
        contractOwner = msg.sender;
        addAirline(airlineAddress, flight);
    }

    /********************************************************************************************/
    /*                                       Events                                             */
    /********************************************************************************************/
    
    event AirlineRegistered(address indexed airlineAddress, string flight);

    event AirlineFunded(address indexed airlineAddress, uint256 amount);

    event InsuranceBought(address indexed insuree, uint256 amount, address airlineAddress, string flight, uint256 timeStamp);

    event InsuranceCreditAvailable(address indexed airlineAccount, string indexed flight);

    event InsuranceCredited(address indexed insuree, uint256 amount);

    event InsurancePaid(address indexed insuree, uint256 amount);
    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsCallerAuthorized() {
        require(authorizedCallers[msg.sender] == true || msg.sender == contractOwner, "Caller is not authorized");
        _;
    }

    modifier requireIsAirlineRegistered()
    {
        require(airlines[msg.sender].isRegistered == true, "Airline is not registered");
        _;
    }

    modifier requireIsAirlineFunded()
    {
        require(airlines[msg.sender].isFunded == true, "Airline is not funded");
        _;
    }
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    function authorizeCaller(address contractAddress) external requireContractOwner {
        authorizedCallers[contractAddress] = true;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (
                                address airlineAddress,
                                string calldata flight
                            )
                            external
                            requireIsCallerAuthorized
    {
        addAirline(airlineAddress, flight);
    }

    function addAirline
                        (
                            address airlineAddress, string memory flight
                        )
                        private
    {
        airlineCount = airlineCount.add(1);
        airlines[airlineAddress] = Airline(airlineAddress, flight, true, false, 0);
        emit AirlineRegistered(airlineAddress, flight);
    }
   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                (       
                    address payable insuree,
                    address airlineAddress,
                    string calldata flight,
                    uint256 timeStamp                      
                )
                external
                payable
    {
        bytes32 flightKey = getFlightKey(airlineAddress, flight, timeStamp);
        airlines[airlineAddress].fund = airlines[airlineAddress].fund.add(msg.value);
        insurances[flightKey].push(Insurance(insuree, msg.value, airlineAddress, flight, timeStamp));
        emit InsuranceBought(insuree, msg.value, airlineAddress, flight, timeStamp);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                            (
                                address airlineAddress,
                                string calldata flight,
                                uint256 timeStamp
                            )
                            external
                            requireIsCallerAuthorized
    {
        bytes32 flightKey = getFlightKey(airlineAddress, flight, timeStamp);
        require(!insuranceCredited[flightKey], "Insurance already credited");
        for (uint i = 0; i < insurances[flightKey].length; i++) 
        {
            address insuree = insurances[flightKey][i].insuree;
            uint256 creditAmount = insurances[flightKey][i].amount.mul(3).div(2);
            creditToInsuree[insuree] = creditToInsuree[insuree].add(creditAmount);
            airlines[airlineAddress].fund = airlines[airlineAddress].fund.sub(creditAmount);
            emit InsuranceCredited(insuree, creditAmount); 
        }
        insuranceCredited[flightKey] = true;
        emit InsuranceCreditAvailable(airlineAddress, flight);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                (
                    address payable insuree
                )
                external
                requireIsCallerAuthorized
    {
        uint256 amount = creditToInsuree[insuree];
        delete(creditToInsuree[insuree]);
        insuree.transfer(amount);
        emit InsurancePaid(insuree, amount);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                (   
                    address airlineAddress
                )
                external
                payable
                requireIsCallerAuthorized
    {
        addFund(airlineAddress, msg.value);
        airlines[airlineAddress].isFunded = true;
        emit AirlineFunded(airlineAddress, msg.value);
    }

    function addFund
                    (
                        address airlineAddress,
                        uint256 fundAmount
                    )
                    private
    {
        airlines[airlineAddress].fund = airlines[airlineAddress].fund.add(fundAmount);
    }

    function isAirlineRegistered
                                (
                                    address airlineAddress
                                )
                                external
                                view
                                returns(bool)
    {
        return airlines[airlineAddress].isRegistered == true;
    }

    function isAirlineFunded
                            (
                                address airlineAddress
                            )
                            external
                            view
                            requireIsCallerAuthorized
                            returns(bool)
    {
        return airlines[airlineAddress].isFunded == true;
    }

    function getFund
                    (
                        address airlineAddress
                    ) 
                    external
                    view
                    requireIsCallerAuthorized
                    returns(uint256) 
    {
        return airlines[airlineAddress].fund;
    }

    function getAirlineCount
                            (
    
                            )
                            external 
                            view
                            returns(uint256)
    {
        return airlineCount;
    }

    function getAmountPaidByInsuree
                                    (
                                        address payable insuree,
                                        address airlineAddress,
                                        string calldata flight,
                                        uint256 timeStamp
                                    )
                                    external
                                    view
                                    returns(uint256 amountPaid)
    {
        amountPaid = 0;
        bytes32 flightKey = getFlightKey(airlineAddress, flight, timeStamp);
        for (uint i = 0; i < insurances[flightKey].length; i++)
        {
            if (insurances[flightKey][i].insuree == insuree)
            {
                amountPaid = insurances[flightKey][i].amount;
                break;
            }
        }
    }

    function getInsureeCredits
                                (
                                    address payable insuree
                                )
                                external
                                view
                                returns(uint256 amount)
    {
        return creditToInsuree[insuree];
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                external 
                payable 
                requireIsAirlineRegistered
    {
        addFund(msg.sender, msg.value);
        airlines[msg.sender].isFunded = true;
        emit AirlineFunded(msg.sender, msg.value);
    }
}


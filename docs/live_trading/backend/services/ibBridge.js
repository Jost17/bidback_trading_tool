/**
 * Interactive Brokers API Bridge Service
 * Node.js interface to Python IB Client
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');

class IBBridgeService extends EventEmitter {
    constructor() {
        super();
        this.pythonProcess = null;
        this.connected = false;
        this.connectionConfig = {
            host: '127.0.0.1',
            port: 7497, // IB Gateway default port (7496 for TWS)
            clientId: 1
        };
        
        // Data storage
        this.positions = new Map();
        this.orders = new Map();
        this.marketData = new Map();
        this.accountSummary = new Map();
        
        // Request tracking
        this.nextRequestId = 1000;
        this.pendingRequests = new Map();
        
        // Connection status
        this.connectionStatus = {
            connected: false,
            lastHeartbeat: null,
            nextOrderId: null,
            error: null
        };
    }
    
    /**
     * Start Python IB Bridge process
     */
    async startBridge() {
        return new Promise((resolve, reject) => {
            try {
                const pythonPath = path.join(process.cwd(), 'ib_bridge/ib_client.py');
                const venvPath = path.join(process.cwd(), 'ib_api_env/bin/python3.13');
                
                console.log('Starting IB Bridge:', venvPath, pythonPath);
                
                this.pythonProcess = spawn(venvPath, [pythonPath], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: { ...process.env }
                });
                
                // Handle stdout (messages from Python)
                this.pythonProcess.stdout.on('data', (data) => {
                    const lines = data.toString().split('\n').filter(line => line.trim());
                    lines.forEach(line => {
                        try {
                            const message = JSON.parse(line);
                            this.handleBridgeMessage(message);
                        } catch (e) {
                            console.error('JSON parse error:', e, 'Line:', line);
                        }
                    });
                });
                
                // Handle stderr (errors from Python)
                this.pythonProcess.stderr.on('data', (data) => {
                    console.error('Python Bridge Error:', data.toString());
                    this.emit('error', { type: 'python_error', message: data.toString() });
                });
                
                // Handle process exit
                this.pythonProcess.on('close', (code) => {
                    console.log('Python Bridge closed with code:', code);
                    this.connected = false;
                    this.connectionStatus.connected = false;
                    this.emit('disconnected', { code });
                });
                
                // Handle process errors
                this.pythonProcess.on('error', (error) => {
                    console.error('Python Bridge process error:', error);
                    reject(error);
                });
                
                // Wait for process to be ready
                setTimeout(() => {
                    if (this.pythonProcess && !this.pythonProcess.killed) {
                        resolve(true);
                    } else {
                        reject(new Error('Python process failed to start'));
                    }
                }, 1000);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Stop Python IB Bridge process
     */
    stopBridge() {
        if (this.pythonProcess) {
            this.sendCommand('disconnect');
            
            setTimeout(() => {
                if (this.pythonProcess && !this.pythonProcess.killed) {
                    this.pythonProcess.kill('SIGTERM');
                }
            }, 1000);
        }
    }
    
    /**
     * Connect to IB Gateway/TWS
     */
    async connect(config = {}) {
        try {
            if (!this.pythonProcess) {
                await this.startBridge();
            }
            
            const connectionConfig = { ...this.connectionConfig, ...config };
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);
                
                // Listen for connection response
                const connectionHandler = (data) => {
                    if (data.type === 'connection') {
                        clearTimeout(timeout);
                        this.removeListener('message', connectionHandler);
                        
                        if (data.data.status === 'connected') {
                            this.connected = true;
                            this.connectionStatus.connected = true;
                            this.connectionStatus.error = null;
                            resolve(data.data);
                        } else {
                            this.connectionStatus.error = data.data.error;
                            reject(new Error(data.data.error || 'Connection failed'));
                        }
                    }
                };
                
                this.on('message', connectionHandler);
                this.sendCommand('connect', connectionConfig);
            });
            
        } catch (error) {
            console.error('IB Connection error:', error);
            throw error;
        }
    }
    
    /**
     * Disconnect from IB
     */
    disconnect() {
        this.sendCommand('disconnect');
        this.connected = false;
        this.connectionStatus.connected = false;
    }
    
    /**
     * Place a trading order
     */
    async placeOrder(orderParams) {
        const { symbol, action, quantity, orderType, price } = orderParams;
        
        if (!this.connected) {
            throw new Error('Not connected to IB');
        }
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Order placement timeout'));
            }, 5000);
            
            const orderHandler = (data) => {
                if (data.type === 'order_placed' || data.type === 'order_error') {
                    clearTimeout(timeout);
                    this.removeListener('message', orderHandler);
                    
                    if (data.type === 'order_placed') {
                        resolve(data.data);
                    } else {
                        reject(new Error(data.data.error));
                    }
                }
            };
            
            this.on('message', orderHandler);
            this.sendCommand('place_order', {
                symbol,
                action,
                quantity,
                order_type: orderType,
                price: price || 0
            });
        });
    }
    
    /**
     * Request real-time market data
     */
    requestMarketData(symbol) {
        if (!this.connected) {
            throw new Error('Not connected to IB');
        }
        
        const reqId = this.nextRequestId++;
        this.sendCommand('request_market_data', { symbol, req_id: reqId });
        return reqId;
    }
    
    /**
     * Cancel market data subscription
     */
    cancelMarketData(reqId) {
        this.sendCommand('cancel_market_data', { req_id: reqId });
    }
    
    /**
     * Request all positions
     */
    requestPositions() {
        this.sendCommand('request_positions');
    }
    
    /**
     * Cancel an order
     */
    cancelOrder(orderId) {
        this.sendCommand('cancel_order', { order_id: orderId });
    }
    
    /**
     * Get connection status
     */
    getStatus() {
        this.sendCommand('status');
        return this.connectionStatus;
    }
    
    /**
     * Get current positions
     */
    getPositions() {
        return Array.from(this.positions.values());
    }
    
    /**
     * Get current orders
     */
    getOrders() {
        return Array.from(this.orders.values());
    }
    
    /**
     * Get current market data
     */
    getMarketData(symbol = null) {
        if (symbol) {
            return this.marketData.get(symbol);
        }
        return Object.fromEntries(this.marketData);
    }
    
    /**
     * Get account summary
     */
    getAccountSummary() {
        return Object.fromEntries(this.accountSummary);
    }
    
    /**
     * Send command to Python bridge
     */
    sendCommand(type, data = {}) {
        if (this.pythonProcess && this.pythonProcess.stdin) {
            const command = JSON.stringify({ type, data });
            this.pythonProcess.stdin.write(command + '\n');
        } else {
            console.error('Python process not available for command:', type);
        }
    }
    
    /**
     * Handle messages from Python bridge
     */
    handleBridgeMessage(message) {
        const { type, data } = message;
        
        // Store data updates
        switch (type) {
            case 'position':
                this.positions.set(data.symbol, data);
                break;
                
            case 'positions_complete':
                // Positions update complete
                break;
                
            case 'order_status':
                this.orders.set(data.order_id, data);
                break;
                
            case 'market_data':
                if (!this.marketData.has(data.symbol)) {
                    this.marketData.set(data.symbol, {});
                }
                const symbolData = this.marketData.get(data.symbol);
                symbolData[data.tick_type] = data.price || data.size;
                symbolData.timestamp = data.timestamp;
                break;
                
            case 'account_summary':
                this.accountSummary.set(data.tag, data);
                break;
                
            case 'next_order_id':
                this.connectionStatus.nextOrderId = data.order_id;
                break;
                
            case 'connection':
                if (data.status === 'connected') {
                    this.connected = true;
                    this.connectionStatus.connected = true;
                    this.connectionStatus.lastHeartbeat = new Date();
                    this.connectionStatus.error = null;
                } else if (data.status === 'disconnected') {
                    this.connected = false;
                    this.connectionStatus.connected = false;
                    if (data.error) {
                        this.connectionStatus.error = data.error;
                    }
                } else if (data.status === 'failed') {
                    this.connected = false;
                    this.connectionStatus.connected = false;
                    this.connectionStatus.error = data.error || 'Connection failed';
                }
                break;
                
            case 'error':
                console.error('IB API Error:', data);
                this.connectionStatus.error = data;
                break;
                
            case 'info':
                console.log('IB API Info:', data);
                // Don't treat informational messages as errors
                break;
        }
        
        // Emit event for listeners
        this.emit('message', { type, data });
        this.emit(type, data);
    }
}

module.exports = { IBBridgeService };
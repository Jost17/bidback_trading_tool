/**
 * Trading API Routes
 * Handles IB API integration for live trading
 */

import { NextRequest, NextResponse } from 'next/server';
const { IBBridgeService } = require('../../../backend/services/ibBridge');

// Global IB Bridge instance
let ibBridge = null;

function getIBBridge() {
    if (!ibBridge) {
        ibBridge = new IBBridgeService();
        
        // Set up event listeners
        ibBridge.on('error', (error) => {
            console.error('IB Bridge Error:', error);
        });
        
        ibBridge.on('disconnected', (data) => {
            console.log('IB Bridge Disconnected:', data);
        });
    }
    return ibBridge;
}

/**
 * GET /api/trading - Get trading status and data
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        
        const bridge = getIBBridge();
        
        switch (action) {
            case 'status':
                const status = bridge.getStatus();
                return NextResponse.json({
                    success: true,
                    data: {
                        ...status,
                        bridgeActive: !!bridge.pythonProcess && !bridge.pythonProcess.killed
                    }
                });
                
            case 'positions':
                const positions = bridge.getPositions();
                return NextResponse.json({
                    success: true,
                    data: { positions }
                });
                
            case 'orders':
                const orders = bridge.getOrders();
                return NextResponse.json({
                    success: true,
                    data: { orders }
                });
                
            case 'market_data':
                const symbol = searchParams.get('symbol');
                const marketData = bridge.getMarketData(symbol);
                return NextResponse.json({
                    success: true,
                    data: { marketData, symbol }
                });
                
            case 'account':
                const accountSummary = bridge.getAccountSummary();
                return NextResponse.json({
                    success: true,
                    data: { accountSummary }
                });
                
            default:
                // Return general status
                return NextResponse.json({
                    success: true,
                    data: {
                        status: bridge.getStatus(),
                        positions: bridge.getPositions(),
                        orders: bridge.getOrders(),
                        accountSummary: bridge.getAccountSummary()
                    }
                });
        }
        
    } catch (error) {
        console.error('Trading API GET Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

/**
 * POST /api/trading - Execute trading actions
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { action, ...data } = body;
        
        const bridge = getIBBridge();
        
        switch (action) {
            case 'connect':
                try {
                    const connectionResult = await bridge.connect(data.config || {});
                    
                    return NextResponse.json({
                        success: true,
                        data: {
                            status: 'connected',
                            ...connectionResult
                        }
                    });
                } catch (error) {
                    return NextResponse.json({
                        success: false,
                        error: error.message,
                        data: { status: 'connection_failed' }
                    }, { status: 400 });
                }
                
            case 'disconnect':
                bridge.disconnect();
                return NextResponse.json({
                    success: true,
                    data: { status: 'disconnected' }
                });
                
            case 'place_order':
                try {
                    const { symbol, orderAction, quantity, orderType, price } = data;
                    
                    // Validate required fields
                    if (!symbol || !orderAction || !quantity || !orderType) {
                        return NextResponse.json({
                            success: false,
                            error: 'Missing required order parameters'
                        }, { status: 400 });
                    }
                    
                    const orderResult = await bridge.placeOrder({
                        symbol,
                        action: orderAction,
                        quantity: parseInt(quantity),
                        orderType,
                        price: price ? parseFloat(price) : 0
                    });
                    
                    return NextResponse.json({
                        success: true,
                        data: orderResult
                    });
                    
                } catch (error) {
                    return NextResponse.json({
                        success: false,
                        error: error.message
                    }, { status: 400 });
                }
                
            case 'cancel_order':
                try {
                    const { orderId } = data;
                    bridge.cancelOrder(orderId);
                    
                    return NextResponse.json({
                        success: true,
                        data: { orderId, status: 'cancellation_sent' }
                    });
                    
                } catch (error) {
                    return NextResponse.json({
                        success: false,
                        error: error.message
                    }, { status: 400 });
                }
                
            case 'request_market_data':
                try {
                    const { symbol } = data;
                    const reqId = bridge.requestMarketData(symbol);
                    
                    return NextResponse.json({
                        success: true,
                        data: { symbol, reqId, status: 'market_data_requested' }
                    });
                    
                } catch (error) {
                    return NextResponse.json({
                        success: false,
                        error: error.message
                    }, { status: 400 });
                }
                
            case 'cancel_market_data':
                try {
                    const { reqId } = data;
                    bridge.cancelMarketData(reqId);
                    
                    return NextResponse.json({
                        success: true,
                        data: { reqId, status: 'market_data_cancelled' }
                    });
                    
                } catch (error) {
                    return NextResponse.json({
                        success: false,
                        error: error.message
                    }, { status: 400 });
                }
                
            case 'request_positions':
                try {
                    bridge.requestPositions();
                    
                    return NextResponse.json({
                        success: true,
                        data: { status: 'positions_requested' }
                    });
                    
                } catch (error) {
                    return NextResponse.json({
                        success: false,
                        error: error.message
                    }, { status: 400 });
                }
                
            default:
                return NextResponse.json({
                    success: false,
                    error: 'Unknown action'
                }, { status: 400 });
        }
        
    } catch (error) {
        console.error('Trading API POST Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

/**
 * DELETE /api/trading - Cleanup and shutdown
 */
export async function DELETE(request) {
    try {
        const bridge = getIBBridge();
        bridge.stopBridge();
        ibBridge = null;
        
        return NextResponse.json({
            success: true,
            data: { status: 'bridge_stopped' }
        });
        
    } catch (error) {
        console.error('Trading API DELETE Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
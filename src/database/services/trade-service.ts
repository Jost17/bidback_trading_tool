import Database from 'better-sqlite3'
import type { Trade, TradeFilters, PerformanceStats, AccountSnapshot } from '../../types/trading'

export class TradeService {
  private insertTrade: Database.Statement
  private updateTradeById: Database.Statement
  private deleteTradeById: Database.Statement
  private getTradeById: Database.Statement
  private updateAccountSnapshot: Database.Statement
  private insertAccountSnapshot: Database.Statement
  private saveTradeWithAccount: Database.Transaction

  constructor(private db: Database.Database) {
    // Prepared statements
    this.insertTrade = db.prepare(`
      INSERT INTO trades (
        trade_id, symbol, side, quantity, entry_price, exit_price,
        entry_datetime, exit_datetime, gross_pnl, commission, net_pnl,
        position_size_percent, risk_amount, stop_loss, target_price,
        account_type, account_balance, setup_type, strategy, trade_notes,
        outcome_analysis, market_breadth_score, spy_price, vix_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    this.updateTradeById = db.prepare(`
      UPDATE trades SET
        symbol = ?, side = ?, quantity = ?, entry_price = ?, exit_price = ?,
        entry_datetime = ?, exit_datetime = ?, gross_pnl = ?, commission = ?, net_pnl = ?,
        position_size_percent = ?, risk_amount = ?, stop_loss = ?, target_price = ?,
        account_type = ?, account_balance = ?, setup_type = ?, strategy = ?, trade_notes = ?,
        outcome_analysis = ?, market_breadth_score = ?, spy_price = ?, vix_level = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    this.deleteTradeById = db.prepare('DELETE FROM trades WHERE id = ?')
    this.getTradeById = db.prepare('SELECT * FROM trades WHERE id = ?')

    this.updateAccountSnapshot = db.prepare(`
      UPDATE account_snapshots 
      SET account_balance = ?, day_pnl = day_pnl + ?, total_pnl = total_pnl + ?
      WHERE date = ?
    `)

    this.insertAccountSnapshot = db.prepare(`
      INSERT INTO account_snapshots (date, account_balance, cash_balance, buying_power, day_pnl, total_pnl)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    // Transaction for atomic trade + account updates
    this.saveTradeWithAccount = db.transaction((trade: Trade) => {
      // Calculate P&L if exit price is provided
      let grossPnl = trade.grossPnl
      let netPnl = trade.netPnl

      if (trade.exitPrice && !grossPnl) {
        grossPnl = (trade.exitPrice - trade.entryPrice) * trade.quantity * (trade.side === 'BUY' ? 1 : -1)
        netPnl = grossPnl - trade.commission
      }

      // Insert trade
      const tradeInfo = this.insertTrade.run(
        trade.tradeId,
        trade.symbol,
        trade.side,
        trade.quantity,
        trade.entryPrice,
        trade.exitPrice || null,
        trade.entryDatetime,
        trade.exitDatetime || null,
        grossPnl || null,
        trade.commission,
        netPnl || null,
        trade.positionSizePercent || null,
        trade.riskAmount || null,
        trade.stopLoss || null,
        trade.targetPrice || null,
        trade.accountType,
        trade.accountBalance,
        trade.setupType || null,
        trade.strategy || null,
        trade.tradeNotes || null,
        trade.outcomeAnalysis || null,
        trade.marketBreadthScore || null,
        trade.spyPrice || null,
        trade.vixLevel || null
      )

      // Update account snapshot if trade is closed (has P&L)
      if (netPnl !== null && netPnl !== undefined) {
        const tradeDate = trade.exitDatetime?.split('T')[0] || trade.entryDatetime.split('T')[0]
        
        // Try to update existing snapshot
        const updateInfo = this.updateAccountSnapshot.run(
          trade.accountBalance + netPnl,
          netPnl,
          netPnl,
          tradeDate
        )

        // If no existing snapshot, create one
        if (updateInfo.changes === 0) {
          this.insertAccountSnapshot.run(
            tradeDate,
            trade.accountBalance + netPnl,
            trade.accountBalance + netPnl, // Assuming cash account for simplicity
            trade.accountBalance + netPnl,
            netPnl,
            netPnl
          )
        }
      }

      return Number(tradeInfo.lastInsertRowid)
    })
  }

  saveCompleteTradeEntry(trade: Trade): number {
    return this.saveTradeWithAccount(trade)
  }

  getTrades(filters?: TradeFilters): Trade[] {
    let query = 'SELECT * FROM trades WHERE 1=1'
    const params: any[] = []

    if (filters?.symbol) {
      query += ' AND symbol = ?'
      params.push(filters.symbol.toUpperCase())
    }

    if (filters?.startDate) {
      query += ' AND entry_datetime >= ?'
      params.push(filters.startDate)
    }

    if (filters?.endDate) {
      query += ' AND entry_datetime <= ?'
      params.push(filters.endDate + 'T23:59:59')
    }

    if (filters?.strategy) {
      query += ' AND strategy = ?'
      params.push(filters.strategy)
    }

    if (filters?.side) {
      query += ' AND side = ?'
      params.push(filters.side)
    }

    if (filters?.accountType) {
      query += ' AND account_type = ?'
      params.push(filters.accountType)
    }

    if (filters?.minPnl !== undefined) {
      query += ' AND net_pnl >= ?'
      params.push(filters.minPnl)
    }

    if (filters?.maxPnl !== undefined) {
      query += ' AND net_pnl <= ?'
      params.push(filters.maxPnl)
    }

    query += ' ORDER BY entry_datetime DESC'

    const results = this.db.prepare(query).all(params) as any[]
    
    return results.map(row => ({
      id: row.id,
      tradeId: row.trade_id,
      symbol: row.symbol,
      side: row.side as 'BUY' | 'SELL',
      quantity: row.quantity,
      entryPrice: row.entry_price,
      exitPrice: row.exit_price,
      entryDatetime: row.entry_datetime,
      exitDatetime: row.exit_datetime,
      grossPnl: row.gross_pnl,
      commission: row.commission,
      netPnl: row.net_pnl,
      positionSizePercent: row.position_size_percent,
      riskAmount: row.risk_amount,
      stopLoss: row.stop_loss,
      targetPrice: row.target_price,
      accountType: row.account_type as 'CASH' | 'MARGIN',
      accountBalance: row.account_balance,
      setupType: row.setup_type,
      strategy: row.strategy,
      tradeNotes: row.trade_notes,
      outcomeAnalysis: row.outcome_analysis,
      marketBreadthScore: row.market_breadth_score,
      spyPrice: row.spy_price,
      vixLevel: row.vix_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  updateTrade(id: number, trade: Partial<Trade>): boolean {
    const existing = this.getTradeById.get(id) as any
    if (!existing) {
      throw new Error(`Trade with id ${id} not found`)
    }

    // Merge with existing data
    const merged = {
      symbol: trade.symbol ?? existing.symbol,
      side: trade.side ?? existing.side,
      quantity: trade.quantity ?? existing.quantity,
      entryPrice: trade.entryPrice ?? existing.entry_price,
      exitPrice: trade.exitPrice ?? existing.exit_price,
      entryDatetime: trade.entryDatetime ?? existing.entry_datetime,
      exitDatetime: trade.exitDatetime ?? existing.exit_datetime,
      grossPnl: trade.grossPnl ?? existing.gross_pnl,
      commission: trade.commission ?? existing.commission,
      netPnl: trade.netPnl ?? existing.net_pnl,
      positionSizePercent: trade.positionSizePercent ?? existing.position_size_percent,
      riskAmount: trade.riskAmount ?? existing.risk_amount,
      stopLoss: trade.stopLoss ?? existing.stop_loss,
      targetPrice: trade.targetPrice ?? existing.target_price,
      accountType: trade.accountType ?? existing.account_type,
      accountBalance: trade.accountBalance ?? existing.account_balance,
      setupType: trade.setupType ?? existing.setup_type,
      strategy: trade.strategy ?? existing.strategy,
      tradeNotes: trade.tradeNotes ?? existing.trade_notes,
      outcomeAnalysis: trade.outcomeAnalysis ?? existing.outcome_analysis,
      marketBreadthScore: trade.marketBreadthScore ?? existing.market_breadth_score,
      spyPrice: trade.spyPrice ?? existing.spy_price,
      vixLevel: trade.vixLevel ?? existing.vix_level
    }

    const info = this.updateTradeById.run(
      merged.symbol,
      merged.side,
      merged.quantity,
      merged.entryPrice,
      merged.exitPrice,
      merged.entryDatetime,
      merged.exitDatetime,
      merged.grossPnl,
      merged.commission,
      merged.netPnl,
      merged.positionSizePercent,
      merged.riskAmount,
      merged.stopLoss,
      merged.targetPrice,
      merged.accountType,
      merged.accountBalance,
      merged.setupType,
      merged.strategy,
      merged.tradeNotes,
      merged.outcomeAnalysis,
      merged.marketBreadthScore,
      merged.spyPrice,
      merged.vixLevel,
      id
    )

    return info.changes > 0
  }

  deleteTrade(id: number): boolean {
    const info = this.deleteTradeById.run(id)
    return info.changes > 0
  }

  getCurrentAccountBalance(): number {
    const result = this.db.prepare(`
      SELECT account_balance FROM account_snapshots 
      ORDER BY date DESC LIMIT 1
    `).get() as { account_balance: number } | undefined

    return result?.account_balance || 0
  }

  getPerformanceStats(startDate?: string, endDate?: string): PerformanceStats {
    let query = 'SELECT * FROM trades WHERE net_pnl IS NOT NULL'
    const params: any[] = []

    if (startDate) {
      query += ' AND entry_datetime >= ?'
      params.push(startDate)
    }

    if (endDate) {
      query += ' AND entry_datetime <= ?'
      params.push(endDate + 'T23:59:59')
    }

    const trades = this.db.prepare(query).all(params) as any[]
    
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnl: 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        currentBalance: this.getCurrentAccountBalance()
      }
    }

    const winningTrades = trades.filter(t => t.net_pnl > 0)
    const losingTrades = trades.filter(t => t.net_pnl < 0)
    
    const totalPnl = trades.reduce((sum, t) => sum + t.net_pnl, 0)
    const grossWins = winningTrades.reduce((sum, t) => sum + t.net_pnl, 0)
    const grossLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.net_pnl, 0))
    
    const avgWin = winningTrades.length > 0 ? grossWins / winningTrades.length : 0
    const avgLoss = losingTrades.length > 0 ? grossLosses / losingTrades.length : 0
    
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.net_pnl)) : 0
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.net_pnl)) : 0
    
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0
    
    // Calculate max drawdown
    let runningPnl = 0
    let peak = 0
    let maxDrawdown = 0
    
    trades.sort((a, b) => new Date(a.entry_datetime).getTime() - new Date(b.entry_datetime).getTime())
    
    for (const trade of trades) {
      runningPnl += trade.net_pnl
      if (runningPnl > peak) {
        peak = runningPnl
      }
      const drawdown = peak - runningPnl
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      totalPnl,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      profitFactor,
      maxDrawdown,
      currentBalance: this.getCurrentAccountBalance()
    }
  }
}
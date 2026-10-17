const t=require('node:test'),a=require('node:assert');const {parseReport,cleanSymbol,num}=require('./import.js');
const html=`<table><tr><th colspan=13>Positions</th></tr>
<tr><th>Time</th><th>Position</th><th>Symbol</th><th>Type</th><th>Volume</th><th>Price</th><th>S / L</th><th>T / P</th><th>Time</th><th>Price</th><th>Commission</th><th>Swap</th><th>Profit</th></tr>
<tr><td>2026.10.12 09:15:03</td><td>5001234</td><td>EURUSD.m</td><td>buy</td><td>0.37</td><td>1.17210</td><td>1.17010</td><td>1.17610</td><td>2026.10.12 11:02:40</td><td>1.17610</td><td>-2.59</td><td>0.00</td><td>1&nbsp;480.00</td></tr>
<tr><td>2026.10.13 14:01:00</td><td>5001300</td><td>XAUUSD</td><td>sell</td><td>0.10</td><td>2 650.50</td><td>2 655.00</td><td>0.00</td><td>2026.10.13 14:20:00</td><td>2 655.00</td><td>-0.70</td><td>-0.10</td><td>-45.00</td></tr>
<tr><td colspan=13>Total</td></tr></table>`;
t('mt5 html',()=>{const r=parseReport(html);a.equal(r.rows.length,2);const x=r.rows[0];
 a.equal(x.ticket,'5001234');a.equal(x.side,'BUY');a.equal(x.lots,0.37);a.equal(x.open,1.1721);a.equal(x.sl,1.1701);a.equal(x.closePrice,1.1761);a.equal(x.profit,1480);a.equal(x.fees,-2.59);a.ok(x.closeTime>x.openTime);
 a.equal(r.rows[1].open,2650.5);a.equal(r.rows[1].profit,-45)});
t('csv comma/semicolon',()=>{
 const c='Ticket,Open Time,Type,Volume,Symbol,Open Price,Close Time,Close Price,Stop Loss,Take Profit,Commission,Swap,Profit\n1,2026-10-12 09:00:00,Buy,0.5,GBPUSD,1.3,2026-10-12 10:00:00,1.31,1.29,1.32,0,0,500\n';
 let r=parseReport(c);a.equal(r.rows.length,1);a.equal(r.rows[0].closePrice,1.31);a.equal(r.rows[0].sl,1.29);a.equal(r.rows[0].profit,500);
 r=parseReport(c.replace(/,/g,';').replace('1;3','1,3'));a.equal(r.rows.length,1)});
t('garbage',()=>{const r=parseReport('hello world');a.equal(r.rows.length,0);a.ok(r.warnings.length)});
t('numbers',()=>{a.equal(num('1 234,56'),1234.56);a.equal(num('1,234.56'),1234.56);a.equal(num('-0.5'),-0.5);a.equal(num(''),null)});
t('symbols',()=>{const k=s=>['EURUSD','XAUUSD','US500'].includes(s);a.equal(cleanSymbol('EURUSD.m',k),'EURUSD');a.equal(cleanSymbol('EURUSDm',k),'EURUSD');a.equal(cleanSymbol('GOLD',k),'XAUUSD');a.equal(cleanSymbol('FOO',k),'FOO')});

import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import App from './App'
import { PublicReceiptPage } from './ReceiptUI'

// קישור קבלה שנשלח ללקוח: /?r=<token>
const receiptToken = new URLSearchParams(window.location.search).get('r')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {receiptToken ? <PublicReceiptPage token={receiptToken} /> : <App />}
  </React.StrictMode>
)

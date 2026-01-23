import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';


function TradingCalendar(){
   return (
    <div style={{padding: '20px'}}>
        <h1>Trading Journal Calendar</h1>
        <Calendar />

    </div>
   )
}

export default TradingCalendar;

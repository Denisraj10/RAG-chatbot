import React, { useState } from 'react';
import axios from 'axios';
import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

function ActionProvider({ createChatBotMessage, setState, children }) {
  const handleMessage = async (message) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const botMessage = createChatBotMessage('Please login first.');
        setState((prev) => ({ ...prev, messages: [...prev.messages, botMessage] }));
        return;
      }

      const response = await axios.post('http://localhost:8000/ask', { question: message });
      const botMessage = createChatBotMessage(response.data.answer);
      setState((prev) => ({ ...prev, messages: [...prev.messages, botMessage] }));
    } catch (error) {
      const botMessage = createChatBotMessage('Error: ' + error.message);
      setState((prev) => ({ ...prev, messages: [...prev.messages, botMessage] }));
    }
  };

  return children({ actions: { handleMessage } });
}

function MessageParser({ children, actions }) {
  const parse = (message) => {
    actions.handleMessage(message);
  };
  return children({ parse });
}

function Config() {
  return {
    initialMessages: [{ id: 1, message: 'Hi! Ask about the company.', type: 'bot' }],
    widgets: [],  // Add if needed
  };
}

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else setLoggedIn(true);
  };

  if (!loggedIn) {
    return (
      <div>
        <h1>Company Chatbot Login</h1>
        <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Company Chatbot</h1>
      <Chatbot
        config={Config()}
        messageParser={MessageParser}
        actionProvider={ActionProvider}
      />
    </div>
  );
}

export default App;
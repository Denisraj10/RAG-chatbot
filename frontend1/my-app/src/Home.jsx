import React, { useState } from "react";
import axios from "axios";
import Chatbot from "react-chatbot-kit";
import "react-chatbot-kit/build/main.css";
import { createClient } from "@supabase/supabase-js";

// Vite env vars
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ✅ ActionProvider as a class
class ActionProvider {
  constructor(createChatBotMessage, setStateFunc) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
  }

  handleMessage = async (message) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const botMessage = this.createChatBotMessage("Please login first.");
        this.setState((prev) => ({
          ...prev,
          messages: [...prev.messages, botMessage],
        }));
        return;
      }

      const response = await axios.post("http://localhost:8000/ask", {
        question: message,
      });

      const botMessage = this.createChatBotMessage(response.data.answer);
      this.setState((prev) => ({
        ...prev,
        messages: [...prev.messages, botMessage],
      }));
    } catch (error) {
      const botMessage = this.createChatBotMessage("Error: " + error.message);
      this.setState((prev) => ({
        ...prev,
        messages: [...prev.messages, botMessage],
      }));
    }
  };
}

// ✅ MessageParser as a class
class MessageParser {
  constructor(actionProvider) {
    this.actionProvider = actionProvider;
  }

  parse(message) {
    this.actionProvider.handleMessage(message);
  }
}

// ✅ Config object
const config = {
  initialMessages: [
    { id: 1, message: "Hi! Ask about the company.", type: "bot" },
  ],
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else setLoggedIn(true);
  };

  if (!loggedIn) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Company Chatbot Login</h1>
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Company Chatbot</h1>
      <Chatbot
        config={config}
        messageParser={MessageParser}
        actionProvider={ActionProvider}
      />
    </div>
  );
}

export default App;

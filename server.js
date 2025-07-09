const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);


const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

let messages = [];

app.post("/completions", async (req, res) => {
  const { message } = req.body;

  // Check if the message includes the "create image" command
  if (message.toLowerCase().includes("create image:")) {
    return res.status(501).send({ error: "Image generation not supported with Gemini." });
  } else {
    try {
      // Add user message to the chat history
      messages.push({ role: "user", content: message });
      console.log("User:", message);

      // Get the assistant's response
      const completion = await getChatCompletion(messages);
      if (!completion) {
        return res.status(500).send({ message: "Something went wrong" });
      }

      // Add assistant reply to history
      messages.push(completion); // The 'completion' object already has the role set to "model"
                                 // because of the change in getChatCompletion below.

      console.log("Assistant:", completion.content);
      res.send({ completion: completion.content });
    } catch (error) {
      console.error("OpenAI chat completion error:", error);
      res.status(500).send({ error: "Failed to get chat completion" });
    }
  }
});



app.post("/newSession", async (req, res) => {
  messages = [];
  res.send({ message: "Session reset" });
});


async function generateImage(prompt) {
  const response = await openai.images.generate({
    model: "dall-e-3", // upgraded from default DALL·E 2
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  if (response.data && response.data[0]?.url) {
    return response.data[0].url;
  } else {
    throw new Error("Image generation failed");
  }
}

async function getChatCompletion(messages) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Your chosen model
      generationConfig: {
        maxOutputTokens: 200, // Set your desired character limit here (approximate tokens)
      },
    });

    // Use the chat method (required for conversation)
    const chat = model.startChat({
      history: messages.map(msg => ({
        // Map roles: 'user' remains 'user', but 'assistant' must become 'model'
        role: msg.role === "assistant" ? "model" : msg.role, // <--- IMPORTANT CHANGE HERE
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(messages[messages.length - 1].content);
    const response = result.response.text();

    // When returning the completion, ensure the role is "model" for Gemini's responses
    return { role: "model", content: response }; // <--- IMPORTANT CHANGE HERE
  } catch (err) {
    console.error("Gemini error:", err);
    return null;
  }
}
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));

AI Coding Assistant

About the Project
This project is a full stack AI based coding assistant developed to help users understand programming concepts and solve coding related doubts through natural language interaction. The application uses the Google Gemini API on the backend to generate intelligent and context aware responses.
The main objective of this project is to build a practical and real world AI application that demonstrates how large language models can be integrated securely into a web application. The frontend provides a clean and simple chat interface where users can ask programming questions. The backend handles all AI related processing, ensuring that the API key is never exposed to the client side.
The application supports conversation history, which allows the AI to understand follow up questions and respond more accurately. This makes the interaction more natural and useful compared to a basic one question one answer chatbot. The project follows proper software development practices such as environment variable management, separation of frontend and backend, version control using Git and cloud deployment.
This project was built as a learning focused implementation to gain hands on experience with backend development, API integration, cloud deployment, and full stack architecture. It is suitable for use as a portfolio project, internship project, or foundation for a final year project.

Live Demo
https://coding-assistant-ep15.onrender.com/

Features
The application provides AI generated answers using the Google Gemini API.
It supports context aware conversations using chat history.
It has a clean and responsive user interface built with basic web technologies.
The backend is secured using environment variables for sensitive data.
The application is deployed on a cloud platform and is accessible publicly.

Technology Stack-
Frontend Technologies
HTML
CSS
JavaScript

Backend Technologies-
Node.js
Google Gemini API

Tools and Platforms-
Git
GitHub
Render for cloud deployment

Project Architecture-
The frontend is responsible only for the user interface and sending user messages.
The backend receives user input, processes it using the Gemini API, and returns the response.
The frontend never communicates directly with the AI service.
All sensitive logic and API keys are handled securely on the server side.

Local Setup Instructions-
Clone the repository using Git.
Navigate to the Backend folder.
Install all required dependencies using npm.
Create a .env file inside the Backend directory and add your Gemini API key.
Start the server using npm start.
Open the application in the browser using localhost on port 3000.

Future Enhancements-
Store chat history permanently using a database.
Add user authentication and user specific conversations.
Improve UI with themes such as dark and light mode.
Add support for document or PDF based learning using retrieval augmented generation.
Improve error handling and response formatting.

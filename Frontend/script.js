async function send() {
  const input = document.getElementById("input");
  const messages = document.getElementById("messages");
  const text = input.value.trim();

  if (!text) return;

  input.value = "";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();

    // Clear UI
    messages.innerHTML = "";

    // Render full history
    data.history.forEach(msg => {
      const div = document.createElement("div");
      div.className = msg.role === "User" ? "user" : "bot";
      div.innerText = msg.content;
      messages.appendChild(div);
    });

    messages.scrollTop = messages.scrollHeight;

  } catch (err) {
    messages.innerHTML += `<div class="bot">❌ Server error</div>`;
  }
}

import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected");

  // test sequence
  setTimeout(() => {
    console.log("testing start_game...");
    socket.emit("start_game");
  }, 500);

  // Remplace bumperId par type
  setTimeout(() => {
    console.log("testing collision...");
    socket.emit("collision", { type: "bumper" }); // 'bumper', 'wall', etc.
  }, 1500);

  setTimeout(() => {
    socket.emit("ball_lost");
  }, 3200);
});

socket.on("state_updated", (state) => {
  console.log("Update received:", state);
});

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set the document title
document.title = "SecureChat - Real-time Group Messaging";

createRoot(document.getElementById("root")!).render(<App />);

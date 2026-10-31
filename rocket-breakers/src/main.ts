import "./ui/style.css";
import { boot } from "./ui/app";

boot(document.getElementById("stage")!, document.getElementById("game") as HTMLCanvasElement, document.getElementById("ui")!);

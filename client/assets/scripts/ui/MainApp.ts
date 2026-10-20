/**
 * Main city / hub placeholder.
 */
import { _decorator, Component } from "cc";
const { ccclass } = _decorator;

@ccclass("MainApp")
export class MainApp extends Component {
  start() {
    console.log("[MainApp] placeholder");
  }
}
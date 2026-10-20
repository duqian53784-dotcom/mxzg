/**
 * Boot entry — stage B will wire scene flow: Boot -> Login -> Main.
 * A10 placeholder.
 */
import { _decorator, Component, director } from "cc";
const { ccclass } = _decorator;

@ccclass("Boot")
export class Boot extends Component {
  start() {
    console.log("[Boot] placeholder — replace with real boot flow in stage B");
    // director.loadScene("Main");
  }
}
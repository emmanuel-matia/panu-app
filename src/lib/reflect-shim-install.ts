// Side-effect module: installs the Reflect metadata shim as soon as it is evaluated.
import { installReflectShim } from "./reflect-shim";

installReflectShim();

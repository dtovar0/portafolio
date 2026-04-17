import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
    static targets = ["output"];

    greet() {
        this.outputTarget.textContent = "¡Hotwire está funcionando perfectamente en Nexus!";
        this.element.style.borderColor = "var(--primary-color)";
    }
}

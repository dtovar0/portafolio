import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
    connect() {
        // This runs every time the dashboard is loaded or navigated to
        if (window.renderUsersByPlatformChart) {
            window.renderUsersByPlatformChart();
        }
        if (window.renderUsersByAreaChart) {
            window.renderUsersByAreaChart();
        }
        if (window.renderPendingRequestsChart) {
            window.renderPendingRequestsChart();
        }
        if (window.renderMostVisitedPlatformsChart) {
            window.renderMostVisitedPlatformsChart();
        }
    }
}

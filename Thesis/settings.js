
document.addEventListener("DOMContentLoaded", () => {
    // =====================================
    // ELEMENTS
    // =====================================

    const message = document.getElementById("settingsMessage");
    const saveButton = document.getElementById("saveSettings");
    const cancelButton = document.getElementById("cancelSettings");

    const tabButtons = document.querySelectorAll(".settings-tab");
    const settingsPanels = document.querySelectorAll(".settings-panel");

    const themeChoices = document.querySelectorAll(".theme-choice");

    const settingIds = [
        "settingsName",
        "settingsEmail",
        "homeName",
        "electricityRate",
        "monthlyBudget",
        "dailyLimit",
        "powerLimit",
        "highUsageToggle",
        "anomalyToggle",
        "offlineToggle",
        "forecastToggle",
        "systemToggle",
        "welcomeToggle",
        "statusToggle"
    ];

    const storageKey = "wattwiseSettings";

    // =====================================
    // SECTION NAVIGATION
    // =====================================

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetId = button.dataset.tab;

            tabButtons.forEach(tab => {
                tab.classList.remove("active");
            });

            settingsPanels.forEach(panel => {
                panel.classList.remove("active");
            });

            button.classList.add("active");

            const targetPanel = document.getElementById(targetId);

            if (targetPanel) {
                targetPanel.classList.add("active");
            }
        });
    });

    // =====================================
    // PROFILE PREVIEW
    // =====================================

    function updateProfilePreview() {
        const name = document.getElementById("settingsName").value.trim();
        const email = document.getElementById("settingsEmail").value.trim();

        const displayName = document.getElementById("profileDisplayName");
        const displayEmail = document.getElementById("profileDisplayEmail");
        const avatar = document.getElementById("profileAvatar");

        displayName.textContent = name || "Demo User";
        displayEmail.textContent = email || "demo@example.com";

        const initials = name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("");

        avatar.textContent = initials || "DU";
    }

    document.getElementById("settingsName")
        .addEventListener("input", updateProfilePreview);

    document.getElementById("settingsEmail")
        .addEventListener("input", updateProfilePreview);

    // =====================================
    // THEME SELECTION
    // =====================================

    function updateThemeSelection(theme) {
        themeChoices.forEach(choice => {
            const selected = choice.dataset.theme === theme;

            choice.classList.toggle("selected", selected);

            const radio = choice.querySelector('input[type="radio"]');

            if (radio) {
                radio.checked = selected;
            }
        });
    }

    themeChoices.forEach(choice => {
        choice.addEventListener("click", () => {
            updateThemeSelection(choice.dataset.theme);
        });
    });

    // =====================================
    // LOAD SAVED SETTINGS
    // =====================================

    function loadSettings() {
        try {
            const saved = localStorage.getItem(storageKey);

            if (!saved) {
                updateProfilePreview();
                updateThemeSelection("dark");
                return;
            }

            const settings = JSON.parse(saved);

            settingIds.forEach(id => {
                const field = document.getElementById(id);

                if (!field || settings[id] === undefined) {
                    return;
                }

                if (field.type === "checkbox") {
                    field.checked = Boolean(settings[id]);
                } else {
                    field.value = settings[id];
                }
            });

            updateProfilePreview();

            updateThemeSelection(settings.theme || "dark");

        } catch (error) {
            console.error("Unable to load WattWise settings:", error);

            message.textContent = "Unable to load saved preferences.";
            message.style.color = "#ff9ca8";
        }
    }

    // =====================================
    // SAVE SETTINGS
    // =====================================

    function saveSettings() {
        const settings = {};

        // Read all settings fields.
        settingIds.forEach(id => {
            const field = document.getElementById(id);

            if (!field) return;

            settings[id] = field.type === "checkbox"
                ? field.checked
                : field.value.trim();
        });

        // Read selected theme.
        const selectedTheme = document.querySelector(
            'input[name="theme"]:checked'
        );

        settings.theme = selectedTheme
            ? selectedTheme.value
            : "dark";

        // Validate required profile fields.
        if (settings.settingsName && settings.settingsName.length > 80) {
            message.textContent = "Please enter a shorter name.";
            message.style.color = "#ff9ca8";
            return;
        }

        if (settings.settingsEmail) {
            const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                settings.settingsEmail
            );

            if (!emailValid) {
                message.textContent = "Please enter a valid email address.";
                message.style.color = "#ff9ca8";
                return;
            }
        }

        // Validate numeric preferences.
        const numericFields = [
            "electricityRate",
            "monthlyBudget",
            "dailyLimit",
            "powerLimit"
        ];

        for (const id of numericFields) {
            const value = settings[id];

            if (value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
                message.textContent = "Please enter valid, non-negative energy values.";
                message.style.color = "#ff9ca8";
                document.getElementById(id).focus();
                return;
            }
        }

        // Save to browser storage.
        try {
            localStorage.setItem(storageKey, JSON.stringify(settings));

            message.textContent = "Preferences saved successfully!";
            message.style.color = "#55e6a5";

            updateProfilePreview();

            // Notify the dashboard that settings were saved.
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(
                    { type: "WATTWISE_SETTINGS_SAVED" },
                    window.location.origin
                );
            }

        } catch (error) {
            console.error("Unable to save WattWise settings:", error);

            message.textContent = "Unable to save preferences.";
            message.style.color = "#ff9ca8";
        }
    }

    // =====================================
    // CLOSE SETTINGS
    // =====================================

    function closeSettings() {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: "WATTWISE_CLOSE_SETTINGS" },
                window.location.origin
            );
        }
    }

    saveButton.addEventListener("click", saveSettings);
    cancelButton.addEventListener("click", closeSettings);

    // =====================================
    // INITIALIZE
    // =====================================

    loadSettings();
});

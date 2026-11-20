
import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


// ==========================================
// 1. SUPABASE CONNECTION
// ==========================================

const SUPABASE_URL = "https://xelefkbalbdisduczdah.supabase.co";

// Keep your existing Supabase publishable key.
const SUPABASE_KEY = "sb_publishable_2RHHou4QgRa1doL0h-rejw_zCSEQtFL";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// TEMPORARY AUTHENTICATION CHECK

async function checkSupabaseSession() {

    const { data, error } = await supabase.auth.getSession();

    console.log("SUPABASE SESSION:", data.session);
    console.log("AUTH ERROR:", error);

}

checkSupabaseSession();


// ==========================================
// 2. HTML ELEMENTS
// ==========================================

const deviceForm = document.getElementById("deviceForm");
const applianceList = document.getElementById("applianceList");
const deviceMessage = document.getElementById("deviceMessage");
const addDeviceButton = document.getElementById("addDeviceButton");

const applianceNameInput = document.getElementById("applianceName");
const deviceCodeInput = document.getElementById("deviceCode");


// ==========================================
// 3. FRONT-END STORAGE
// ==========================================

let registeredAppliances = [];

let syncInProgress = false;


// ==========================================
// 4. GET CURRENT USER
// ==========================================

async function getCurrentUser() {

    const { data, error } = await supabase.auth.getUser();

    if (error) {
        throw error;
    }

    if (!data.user) {
        throw new Error("Please log in first.");
    }

    return data.user;
}


// ==========================================
// 5. REGISTER APPLIANCE IN SUPABASE
// ==========================================

async function addAppliance(applianceName, deviceCode) {

    const user = await getCurrentUser();

    const { data, error } = await supabase
        .from("appliances")
        .insert({
            user_id: user.id,
            name: applianceName,
            device_code: deviceCode
        })
        .select()
        .single();

    if (error) {

        if (error.code === "23505") {
            throw new Error(
                "This Smart Plug ID is already registered."
            );
        }

        throw error;
    }

    return data;
}


// ==========================================
// 6. DISPLAY REGISTERED APPLIANCES
// ==========================================

function loadAppliances() {

    applianceList.replaceChildren();

    // EMPTY LIST MESSAGE

    if (registeredAppliances.length === 0) {

        const empty = document.createElement("p");

        empty.className = "appliance-empty";
        empty.textContent = "No registered appliances yet.";

        applianceList.appendChild(empty);

        return;
    }


    // DISPLAY EACH APPLIANCE

    registeredAppliances.forEach(appliance => {

        const item = document.createElement("div");

        item.className = "appliance-item";


        // APPLIANCE INFORMATION

        const info = document.createElement("div");

        info.className = "appliance-info";

        const name = document.createElement("strong");

        name.textContent = appliance.name;

        const code = document.createElement("small");

        code.textContent =
            "Smart Plug · " + appliance.deviceCode;

        info.append(name, code);


        // APPLIANCE READINGS

        const details = document.createElement("div");

        details.className = "appliance-reading";

        const power = document.createElement("strong");

        power.textContent =
            appliance.power !== null
                ? Number(appliance.power).toFixed(2) + " W"
                : "-- W";

        const energy = document.createElement("small");

        energy.textContent =
            appliance.energy !== null
                ? Number(appliance.energy).toFixed(3) + " kWh"
                : "No recent reading";


        // ONLINE / OFFLINE STATUS

        const status = document.createElement("span");

        status.className = appliance.online
            ? "online-status"
            : "offline-status";

        status.textContent = appliance.online
            ? "● Online"
            : "● Offline";


        // DATABASE REGISTRATION STATUS

        const savedStatus = document.createElement("small");

        savedStatus.className = "saved-status";

        savedStatus.textContent = appliance.saved
            ? "Registered"
            : "Pending database sync";


        // COMBINE ELEMENTS

        details.append(power, energy, status);

        item.append(info, details, savedStatus);

        applianceList.appendChild(item);

    });

}


// ==========================================
// 7. LOAD AND SYNCHRONIZE APPLIANCES
// ==========================================

async function syncAppliances() {

    // PREVENT OVERLAPPING SYNCHRONIZATION

    if (syncInProgress) return;

    syncInProgress = true;

    try {

        const user = await getCurrentUser();


        // GET REGISTERED APPLIANCES FROM SUPABASE

        const { data: appliances, error } = await supabase
            .from("appliances")
            .select("id, name, device_code, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;


        // MERGE DATABASE RECORDS
        // DO NOT CLEAR THE EXISTING ARRAY

        for (const appliance of appliances || []) {

            const existing = registeredAppliances.find(item =>

                item.deviceCode?.trim().toLowerCase() ===
                appliance.device_code?.trim().toLowerCase()

            );


            if (existing) {

                // UPDATE EXISTING FRONT-END RECORD

                existing.id = appliance.id;

                existing.name = appliance.name;

                existing.deviceCode = appliance.device_code;

                existing.saved = true;

            } else {

                // ADD NEW DATABASE RECORD

                registeredAppliances.push({

                    id: appliance.id,

                    name: appliance.name,

                    deviceCode: appliance.device_code,

                    power: null,

                    energy: null,

                    online: false,

                    saved: true

                });

            }

        }


        // GET ALL APPLIANCE IDS

        const applianceIds = (appliances || []).map(
            appliance => appliance.id
        );


        // GET LATEST ENERGY READINGS

        if (applianceIds.length > 0) {

            const { data: readings, error: readingError } = await supabase
                .from("energy_readings")
                .select("appliance_id, power_w, energy_kwh, recorded_at")
                .in("appliance_id", applianceIds)
                .order("recorded_at", { ascending: false });

            if (readingError) {

                console.error(
                    "Energy readings error:",
                    readingError
                );

            } else {

                // GET LATEST READING PER APPLIANCE

                const latestReadings = new Map();

                for (const reading of readings || []) {

                    if (!latestReadings.has(reading.appliance_id)) {

                        latestReadings.set(
                            reading.appliance_id,
                            reading
                        );

                    }

                }


                // UPDATE POWER, ENERGY AND STATUS

                registeredAppliances.forEach(appliance => {

                    const reading = latestReadings.get(appliance.id);

                    if (!reading) return;

                    appliance.power = reading.power_w;

                    appliance.energy = reading.energy_kwh;

                    appliance.online =
                        (Date.now() -
                            new Date(reading.recorded_at).getTime())
                        <= 30000;

                });

            }

        }


        // UPDATE WEBSITE

        loadAppliances();


    } catch (error) {

        console.error("Supabase sync error:", error);

        // KEEP EXISTING APPLIANCES VISIBLE

        loadAppliances();

    } finally {

        syncInProgress = false;

    }

}


// ==========================================
// 8. REGISTER APPLIANCE BUTTON
// ==========================================

deviceForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const applianceName = applianceNameInput.value.trim();

    const deviceCode = deviceCodeInput.value.trim();


    // VALIDATE INPUTS

    if (!applianceName || !deviceCode) {

        deviceMessage.textContent =
            "Please enter both the appliance name and device code.";

        return;

    }


    // CHECK DUPLICATE DEVICE CODE

    const existingDevice = registeredAppliances.find(appliance =>

        appliance.deviceCode?.trim().toLowerCase() ===
        deviceCode.toLowerCase()

    );

    if (existingDevice) {

        deviceMessage.textContent =
            "This Smart Plug ID is already registered.";

        return;

    }


    // DISABLE BUTTON

    addDeviceButton.disabled = true;

    addDeviceButton.textContent = "Registering...";


    // CREATE TEMPORARY FRONT-END RECORD

    const newAppliance = {

        id: null,

        name: applianceName,

        deviceCode: deviceCode,

        power: null,

        energy: null,

        online: false,

        saved: false

    };


    // DISPLAY IMMEDIATELY

    registeredAppliances.unshift(newAppliance);

    loadAppliances();

    deviceForm.reset();

    deviceMessage.textContent = "Registering appliance...";


    // SAVE TO SUPABASE

    try {

        const savedAppliance = await addAppliance(
            applianceName,
            deviceCode
        );


        // UPDATE FRONT-END RECORD

        newAppliance.id = savedAppliance.id;

        newAppliance.saved = true;

        deviceMessage.textContent =
            "Appliance successfully registered!";


        loadAppliances();


    } catch (error) {

        console.error("SUPABASE REGISTRATION ERROR:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            status: error.status
});


        // KEEP THE APPLIANCE VISIBLE

        deviceMessage.textContent =
            "Appliance is visible, but database registration failed: " +
            error.message;

        loadAppliances();

    } finally {

        addDeviceButton.disabled = false;

        addDeviceButton.textContent = "+ Register Appliance";

    }

});


// ==========================================
// 9. INITIAL LOAD
// ==========================================

// DISPLAY EMPTY STATE

loadAppliances();


// LOAD SAVED APPLIANCES

syncAppliances();


// ==========================================
// 10. AUTOMATIC REFRESH
// ==========================================

// REFRESH EVERY 10 SECONDS

setInterval(syncAppliances, 10000);

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {

        if (!confirm("Are you sure you want to log out?")) {
            return;
        }

        try {
            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            window.location.href = "login.html";

        } catch (error) {
            console.error("Logout error:", error);
            alert("Unable to log out. Please try again.");
        }

    });
}
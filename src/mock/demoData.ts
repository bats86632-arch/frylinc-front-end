import { User, Panel, Branch, PanelMap } from "../types";
import { Company } from "../api/CompanyService";

const DEMO_STORAGE_KEY = "fyrlinc_demo_mode_active";

export function isDemoModeActive(): boolean {
  try {
    return (
      sessionStorage.getItem(DEMO_STORAGE_KEY) === "true" ||
      localStorage.getItem(DEMO_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

export function setDemoModeActive(active: boolean): void {
  try {
    if (active) {
      sessionStorage.setItem(DEMO_STORAGE_KEY, "true");
      localStorage.setItem(DEMO_STORAGE_KEY, "true");
    } else {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
  } catch {
    // ignore storage restrictions
  }
}

/** Demo User: unauthorized reviewer profile with full sandbox privileges */
export const DEMO_USER: User = {
  uid: "demo-user-reviewer-sandbox",
  email: "demo@fyrlinc.com",
  displayName: "Reviewer Sandbox User",
  firstName: "Demo",
  lastName: "Reviewer",
  phoneNumber: "+1 555-0199",
  role: "super_admin",
  companyId: "demo-comp-apex",
  companyName: "Apex Commercial Towers",
  companyRole: "Lead Safety Auditor",
  employeeId: "DEMO-REV-01",
  dateOfBirth: "1990-01-01",
  branchIds: ["demo-branch-tower1", "demo-branch-tower2"],
  assignments: {
    "demo-comp-apex": ["demo-branch-tower1", "demo-branch-tower2"],
    "demo-comp-metro": ["demo-branch-logistics", "demo-branch-hub"],
  },
};

/** 2 Sample Companies for App Reviewers */
export const DEMO_COMPANIES: Company[] = [
  {
    id: "demo-comp-apex",
    name: "Apex Commercial Towers Ltd",
    email: "safety@apextowers.demo",
    phone: "+1 555-0100",
    address: "Financial District, Towers 1 & 2",
    branchCount: 2,
    panelCount: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-comp-metro",
    name: "Metro Industrial Logistics Hub",
    email: "operations@metrologistics.demo",
    phone: "+1 555-0200",
    address: "700 Logistics Way, Bay Area",
    branchCount: 2,
    panelCount: 1,
    createdAt: new Date().toISOString(),
  },
];

/** Sample Branches across the 2 companies */
export const DEMO_BRANCHES: Branch[] = [
  {
    id: "demo-branch-tower1",
    branchId: "demo-branch-tower1",
    companyId: "demo-comp-apex",
    name: "Tower 1 - Corporate HQ",
    addressLine1: "Floors 1-28",
    supervisorName: "Sarah Jenkins",
    contactNumber: "+1 555-0101",
    enabled: true,
  },
  {
    id: "demo-branch-tower2",
    branchId: "demo-branch-tower2",
    companyId: "demo-comp-apex",
    name: "Tower 2 - Executive Suites",
    addressLine1: "Floors 29-54",
    supervisorName: "David Ross",
    contactNumber: "+1 555-0102",
    enabled: true,
  },
  {
    id: "demo-branch-logistics",
    branchId: "demo-branch-logistics",
    companyId: "demo-comp-metro",
    name: "Warehouse Alpha",
    addressLine1: "Sector 4 Logistics Bay",
    supervisorName: "Marcus Vance",
    contactNumber: "+1 555-0201",
    enabled: true,
  },
  {
    id: "demo-branch-hub",
    branchId: "demo-branch-hub",
    companyId: "demo-comp-metro",
    name: "Cold Storage Distribution Hub",
    addressLine1: "Sector 7 Bay",
    supervisorName: "Elena Rostova",
    contactNumber: "+1 555-0202",
    enabled: true,
  },
];

/** Sample Panels with simulated telemetry and alarms */
export const DEMO_PANELS: Panel[] = [
  {
    serial: "DEMO-PNL-01",
    name: "Main Fire Control Unit - Tower 1",
    enabled: true,
    alarm: false,
    companyId: "demo-comp-apex",
    branchId: "demo-branch-tower1",
    mqttConnected: true,
    allowedCommands: ["SILENCE", "RESET", "EVACUATE"],
    zoneCount: 8,
    zones: [false, false, false, false, false, false, false, false],
    zoneNames: {
      "0": "Ground Floor Lobby",
      "1": "Basement Parking B1",
      "2": "Atrium & Cafeteria",
      "3": "Floor 4 Conference Wing",
      "4": "Floor 8 Executive Offices",
      "5": "Floor 12 Data Center",
      "6": "Electrical Shaft East",
      "7": "Rooftop HVAC Unit",
    },
  },
  {
    serial: "DEMO-PNL-02",
    name: "Critical Systems Panel - Tower 2",
    enabled: true,
    alarm: true,
    companyId: "demo-comp-apex",
    branchId: "demo-branch-tower2",
    mqttConnected: true,
    allowedCommands: ["SILENCE", "RESET", "EVACUATE"],
    zoneCount: 8,
    zones: [false, false, true, false, false, false, false, false],
    zoneNames: {
      "0": "East Wing Stairwell",
      "1": "Floor 30 Server Vault",
      "2": "Floor 32 Electrical Riser",
      "3": "Floor 35 Sky Lounge",
      "4": "Floor 40 Mechanical Room",
      "5": "Elevator Shaft Core",
      "6": "Floor 48 Terrace",
      "7": "Helipad Life Safety",
    },
  },
  {
    serial: "DEMO-PNL-03",
    name: "Industrial Bay Master Panel",
    enabled: true,
    alarm: false,
    companyId: "demo-comp-metro",
    branchId: "demo-branch-logistics",
    mqttConnected: true,
    allowedCommands: ["SILENCE", "RESET", "EVACUATE"],
    zoneCount: 6,
    zones: [false, false, false, false, false, false],
    zoneNames: {
      "0": "Loading Dock 1-4",
      "1": "Automated Stacking Bay",
      "2": "Battery Charging Area",
      "3": "Hazardous Materials Vault",
      "4": "Administration Block",
      "5": "Perimeter Hydrant System",
    },
  },
];

/** Mock Floor Plan and Polygon Zones for GMS Demo */
export const DEMO_PANEL_MAP: PanelMap = {
  imageUrl:
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700" viewBox="0 0 1000 700">
        <rect width="1000" height="700" fill="#181a1f"/>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#252830" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="1000" height="700" fill="url(#grid)"/>
        <!-- Floor Outline -->
        <rect x="60" y="60" width="880" height="580" fill="#20232a" stroke="#3b4252" stroke-width="3" rx="8"/>
        <!-- Interior walls -->
        <line x1="500" y1="60" x2="500" y2="400" stroke="#4c566a" stroke-width="2"/>
        <line x1="60" y1="400" x2="940" y2="400" stroke="#4c566a" stroke-width="2"/>
        <line x1="300" y1="400" x2="300" y2="640" stroke="#4c566a" stroke-width="2"/>
        <line x1="700" y1="400" x2="700" y2="640" stroke="#4c566a" stroke-width="2"/>
        <text x="100" y="110" fill="#8892b0" font-family="sans-serif" font-size="20" font-weight="bold">SAMPLE ARCHITECTURAL FLOOR PLAN - LEVEL 1</text>
        <text x="100" y="140" fill="#5c677d" font-family="sans-serif" font-size="14">Demonstration Sandbox Environment</text>
        <text x="120" y="250" fill="#64748b" font-family="sans-serif" font-size="16">ZONE 1: LOBBY</text>
        <text x="600" y="250" fill="#64748b" font-family="sans-serif" font-size="16">ZONE 2: ATRIUM & CAFE</text>
        <text x="100" y="520" fill="#64748b" font-family="sans-serif" font-size="16">ZONE 3: PARKING</text>
        <text x="420" y="520" fill="#64748b" font-family="sans-serif" font-size="16">ZONE 4: CONF WING</text>
        <text x="760" y="520" fill="#64748b" font-family="sans-serif" font-size="16">ZONE 5: OFFICES</text>
      </svg>
    `),
  imagePath: "demo/sample-floorplan.svg",
  updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as unknown as any,
  updatedBy: "demo-user-reviewer-sandbox",
  zones: [
    {
      zoneId: "DEMO-PNL-01-Z1",
      label: "DEMO-PNL-01 — Zone 1 (Ground Floor Lobby)",
      points: [
        { x: 8, y: 15 },
        { x: 48, y: 15 },
        { x: 48, y: 55 },
        { x: 8, y: 55 },
      ],
    },
    {
      zoneId: "DEMO-PNL-01-Z2",
      label: "DEMO-PNL-01 — Zone 2 (Atrium & Cafeteria)",
      points: [
        { x: 52, y: 15 },
        { x: 92, y: 15 },
        { x: 92, y: 55 },
        { x: 52, y: 55 },
      ],
    },
    {
      zoneId: "DEMO-PNL-01-Z3",
      label: "DEMO-PNL-01 — Zone 3 (Basement Parking B1)",
      points: [
        { x: 8, y: 60 },
        { x: 28, y: 60 },
        { x: 28, y: 90 },
        { x: 8, y: 90 },
      ],
    },
    {
      zoneId: "DEMO-PNL-01-Z4",
      label: "DEMO-PNL-01 — Zone 4 (Floor 4 Conference Wing)",
      points: [
        { x: 32, y: 60 },
        { x: 68, y: 60 },
        { x: 68, y: 90 },
        { x: 32, y: 90 },
      ],
    },
  ],
};

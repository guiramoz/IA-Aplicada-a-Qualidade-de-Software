class AppState {
  constructor(patientStorageKey, triageStorageKey) {
    this.patientStorageKey = patientStorageKey;
    this.triageStorageKey = triageStorageKey;
    this.triages = JSON.parse(localStorage.getItem(triageStorageKey) || "[]");
    const triagedPatientIds = new Set(this.triages.map((triage) => triage.patientId));
    this.patients = JSON.parse(localStorage.getItem(patientStorageKey) || "[]").map((patient) => ({
      ...patient,
      triageStatus: patient.triageStatus || (triagedPatientIds.has(patient.id) ? "concluida" : "aguardando")
    }));
    this.activeScreen = "cadastro";
    this.selectedPatientId = "";
  }

  save() {
    localStorage.setItem(this.patientStorageKey, JSON.stringify(this.patients));
    localStorage.setItem(this.triageStorageKey, JSON.stringify(this.triages));
  }

  getPatientName(patient) {
    return `${patient.firstName} ${patient.lastName}`;
  }

  getSelectedPatient() {
    return this.patients.find((patient) => patient.id === this.selectedPatientId);
  }

  getPendingPatients() {
    return this.patients.filter((patient) => patient.triageStatus !== "concluida");
  }

  getCompletedPatients() {
    return this.patients.filter((patient) => patient.triageStatus === "concluida");
  }

  getPatientTriage(patientId) {
    return [...this.triages].reverse().find((triage) => triage.patientId === patientId);
  }
}

window.AppState = AppState;

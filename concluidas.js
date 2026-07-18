class CompletedTriagesController {
  constructor(state, dom, callbacks, priorityLabels) {
    this.state = state;
    this.dom = dom;
    this.callbacks = callbacks;
    this.priorityLabels = priorityLabels;
  }

  init() {
    this.dom.completedList.addEventListener("click", (event) => this.handleListClick(event));
  }

  handleListClick(event) {
    const reopenButton = event.target.closest("[data-reopen-patient]");
    if (!reopenButton) {
      return;
    }

    const patient = this.state.patients.find((item) => item.id === reopenButton.dataset.reopenPatient);
    if (!patient) {
      return;
    }

    patient.triageStatus = "aguardando";
    delete patient.triageClassification;
    delete patient.triageCompletedAt;
    this.state.save();
    this.callbacks.renderAll();
  }

  render() {
    const patients = this.state.getCompletedPatients();
    if (patients.length === 0) {
      this.dom.completedList.innerHTML = `<div class="empty-state">Nenhuma triagem concluida ainda.</div>`;
      return;
    }

    this.dom.completedList.innerHTML = patients.map((patient) => {
      const latestTriage = this.state.getPatientTriage(patient.id);
      const classification = patient.triageClassification || latestTriage?.classification || "branco";
      const completedAt = patient.triageCompletedAt || latestTriage?.time || "--:--";
      return `
        <article class="patient-card">
          <header>
            <div>
              <strong>${this.state.getPatientName(patient)}</strong>
              <small>${patient.age} anos · ${patient.gender}</small>
            </div>
            <span class="tag ${classification}">${this.priorityLabels[classification] || "Triado"}</span>
          </header>
          <div class="meta-line">${patient.address}</div>
          <div class="meta-line">Triagem concluida às ${completedAt}</div>
          <div class="meta-line">${patient.insuranceName} · ${patient.insuranceCard}</div>
          <div class="patient-actions">
            <button class="small-button" data-reopen-patient="${patient.id}" type="button">Voltar para aguardando</button>
          </div>
        </article>
      `;
    }).join("");
  }
}

window.CompletedTriagesController = CompletedTriagesController;

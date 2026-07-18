class TriageController {
  constructor(state, dom, callbacks, priorityLabels) {
    this.state = state;
    this.dom = dom;
    this.callbacks = callbacks;
    this.priorityLabels = priorityLabels;
    this.fieldNames = [
      "triagePatient",
      "bloodPressure",
      "temperature",
      "oxygen",
      "heartRate",
      "symptoms",
      "classification"
    ];
  }

  init() {
    this.dom.triagePatient.addEventListener("change", () => this.selectPatient());
    ["bloodPressure", "temperature", "oxygen", "heartRate", "symptoms"].forEach((id) => {
      const field = document.getElementById(id);
      field.addEventListener("input", () => {
        this.enforceFieldInput(id);
        this.validateField(id);
      });
      field.addEventListener("blur", () => this.validateField(id));
    });
    document.querySelectorAll('input[name="classification"]').forEach((field) => {
      field.addEventListener("change", () => this.validateField("classification"));
    });
    this.dom.suggestRisk.addEventListener("click", () => this.suggestRisk());
    this.dom.triageForm.addEventListener("submit", (event) => this.handleSubmit(event));
    this.dom.clearTriageForm.addEventListener("click", () => this.reset());
  }

  selectPatient() {
    this.state.selectedPatientId = this.dom.triagePatient.value;
    this.validateField("triagePatient");
    this.renderPatientSummary();
  }

  getField(fieldName) {
    return this.dom.triageForm.elements.namedItem(fieldName);
  }

  getErrorElement(fieldName) {
    return this.dom.triageForm.querySelector(`[data-error-for="${fieldName}"]`);
  }

  setFieldState(fieldName, message) {
    const errorElement = this.getErrorElement(fieldName);
    const fields = fieldName === "classification"
      ? Array.from(document.querySelectorAll('input[name="classification"]'))
      : [this.getField(fieldName)].filter(Boolean);

    fields.forEach((field) => {
      field.classList.toggle("input-error", Boolean(message));
      field.setAttribute("aria-invalid", message ? "true" : "false");
    });

    if (errorElement) {
      errorElement.textContent = message || "";
    }

    return !message;
  }

  normalizeText(value) {
    return String(value || "").trim();
  }

  enforceFieldInput(fieldName) {
    const field = document.getElementById(fieldName);
    if (!field) {
      return;
    }

    const cleaners = {
      bloodPressure: (value) => value.replace(/[^\d\/-]/g, ""),
      temperature: (value) => value.replace(/[^\d.,]/g, ""),
      oxygen: (value) => value.replace(/[^\d]/g, ""),
      heartRate: (value) => value.replace(/[^\d]/g, ""),
      symptoms: (value) => value
    };

    const cleaner = cleaners[fieldName];
    if (cleaner) {
      const cleaned = cleaner(field.value);
      if (cleaned !== field.value) {
        field.value = cleaned;
      }
    }
  }

  parseBloodPressure(value) {
    const parts = value.split(/[\/-]/);
    return {
      systolic: Number(parts[0]),
      diastolic: Number(parts[1])
    };
  }

  calculateSuggestion() {
    const pressure = this.parseBloodPressure(document.getElementById("bloodPressure").value);
    const temperature = parseFloat(document.getElementById("temperature").value);
    const oxygen = Number(document.getElementById("oxygen").value);
    const symptoms = document.getElementById("symptoms").value.toLowerCase();
    const heartRate = Number(document.getElementById("heartRate").value);

    let risk = "verde";
    let reason = "sinais vitais estáveis";

    if (
      oxygen < 90 ||
      pressure.systolic >= 180 ||
      pressure.diastolic >= 120 ||
      temperature >= 39 ||
      heartRate >= 130 ||
      symptoms.includes("dor no peito") ||
      symptoms.includes("convuls") ||
      symptoms.includes("desmaio") ||
      symptoms.includes("confus") ||
      symptoms.includes("sangramento intenso")
    ) {
      risk = "vermelho";
      reason = "há sinais de instabilidade clínica";
    } else if (
      oxygen < 94 ||
      pressure.systolic >= 160 ||
      pressure.diastolic >= 100 ||
      temperature >= 38 ||
      heartRate > 120 ||
      symptoms.includes("falta de ar") ||
      symptoms.includes("vomit") ||
      symptoms.includes("dor intensa") ||
      symptoms.includes("fraqueza") ||
      symptoms.includes("piora rápida")
    ) {
      risk = "amarelo";
      reason = "há alteração moderada dos sinais vitais";
    } else if (symptoms.includes("receita") || symptoms.includes("atestado")) {
      risk = "branco";
      reason = "queixa administrativa";
    }

    return { risk, reason };
  }

  validateField(fieldName) {
    switch (fieldName) {
      case "triagePatient":
        if (!this.state.selectedPatientId) {
          return this.setFieldState(fieldName, "Selecione o paciente antes de registrar a triagem.");
        }
        return this.setFieldState(fieldName, "");
      case "bloodPressure": {
        const value = this.normalizeText(this.getField(fieldName)?.value);
        if (!value) {
          return this.setFieldState(fieldName, "Informe a pressão arterial.");
        }
        if (!/^\d{2,3}[\/-]\d{2,3}$/.test(value)) {
          return this.setFieldState(fieldName, "Use o formato 120/80 na pressão arterial.");
        }
        const { systolic, diastolic } = this.parseBloodPressure(value);
        if (systolic < 50 || systolic > 260 || diastolic < 30 || diastolic > 180) {
          return this.setFieldState(fieldName, "Informe valores plausíveis de pressão arterial.");
        }
        return this.setFieldState(fieldName, "");
      }
      case "temperature": {
        const value = this.normalizeText(this.getField(fieldName)?.value);
        if (!value) {
          return this.setFieldState(fieldName, "Informe a temperatura.");
        }
        if (!/^\d+([.,]\d+)?$/.test(value)) {
          return this.setFieldState(fieldName, "A temperatura deve ser numérica, como 36.5.");
        }
        const temperature = Number(value.replace(",", "."));
        if (temperature < 30 || temperature > 45) {
          return this.setFieldState(fieldName, "Informe uma temperatura plausível.");
        }
        return this.setFieldState(fieldName, "");
      }
      case "oxygen": {
        const value = this.normalizeText(this.getField(fieldName)?.value);
        if (!value) {
          return this.setFieldState(fieldName, "Informe a oxigenação.");
        }
        if (!/^\d+$/.test(value)) {
          return this.setFieldState(fieldName, "A oxigenação deve conter apenas números.");
        }
        const oxygen = Number(value);
        if (oxygen < 0 || oxygen > 100) {
          return this.setFieldState(fieldName, "A oxigenação deve estar entre 0 e 100.");
        }
        return this.setFieldState(fieldName, "");
      }
      case "heartRate": {
        const value = this.normalizeText(this.getField(fieldName)?.value);
        if (!value) {
          return this.setFieldState(fieldName, "");
        }
        if (!/^\d+$/.test(value)) {
          return this.setFieldState(fieldName, "A frequência cardíaca deve conter apenas números.");
        }
        const heartRate = Number(value);
        if (heartRate < 20 || heartRate > 260) {
          return this.setFieldState(fieldName, "Informe uma frequência cardíaca plausível.");
        }
        return this.setFieldState(fieldName, "");
      }
      case "symptoms": {
        const value = this.normalizeText(this.getField(fieldName)?.value);
        if (!value) {
          return this.setFieldState(fieldName, "Descreva os sintomas do paciente.");
        }
        if (value.length < 5) {
          return this.setFieldState(fieldName, "Descreva melhor os sintomas.");
        }
        return this.setFieldState(fieldName, "");
      }
      case "classification": {
        const selected = document.querySelector('input[name="classification"]:checked');
        if (!selected) {
          return this.setFieldState(fieldName, "Confirme manualmente a classificação antes de salvar.");
        }
        return this.setFieldState(fieldName, "");
      }
      default:
        return true;
    }
  }

  validateAllFields() {
    const requiredFields = ["triagePatient", "bloodPressure", "temperature", "oxygen", "symptoms", "classification"];
    const invalidFields = [];

    requiredFields.forEach((fieldName) => {
      if (!this.validateField(fieldName)) {
        invalidFields.push(fieldName);
      }
    });

    ["heartRate"].forEach((fieldName) => this.validateField(fieldName));

    if (invalidFields.length > 0) {
      const firstInvalid = fieldName => fieldName === "classification"
        ? document.querySelector('input[name="classification"]')
        : this.getField(fieldName);
      const target = firstInvalid(invalidFields[0]);
      if (target && typeof target.focus === "function") {
        target.focus();
      }
      return false;
    }

    return true;
  }

  suggestRisk() {
    const requiredFields = ["bloodPressure", "temperature", "oxygen", "symptoms"];
    const incomplete = requiredFields.some((fieldName) => !this.normalizeText(document.getElementById(fieldName).value));
    if (incomplete) {
      this.dom.riskSuggestion.textContent = "Preencha os sinais vitais e sintomas para gerar a sugestão.";
      return;
    }

    const suggestion = this.calculateSuggestion();
    this.dom.riskSuggestion.textContent = `Sugestão: ${this.priorityLabels[suggestion.risk]} - ${suggestion.reason}. Confirme manualmente na classificação.`;
  }

  handleSubmit(event) {
    event.preventDefault();
    if (!this.validateAllFields()) {
      this.callbacks.showMessage(this.dom.triageMessage, "Corrija os campos destacados antes de salvar.");
      return;
    }

    const data = new FormData(this.dom.triageForm);
    const classification = data.get("classification");

    this.state.triages.push({
      id: crypto.randomUUID(),
      patientId: this.state.selectedPatientId,
      bloodPressure: data.get("bloodPressure"),
      temperature: data.get("temperature"),
      oxygen: data.get("oxygen"),
      heartRate: data.get("heartRate"),
      symptoms: data.get("symptoms").trim(),
      classification,
      time: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    });

    const patient = this.state.getSelectedPatient();
    if (patient) {
      patient.triageStatus = "concluida";
      patient.triageClassification = classification;
      patient.triageCompletedAt = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    this.state.save();
    this.reset();
    this.callbacks.showTriageTransition(classification, "fila");
  }

  reset() {
    this.dom.triageForm.reset();
    this.state.selectedPatientId = "";
    this.dom.riskSuggestion.textContent = "Sem sugestão";
    this.fieldNames.forEach((fieldName) => this.setFieldState(fieldName, ""));
    this.renderPatientOptions();
    this.renderPatientSummary();
    this.renderVitalPreview();
  }

  renderPatientOptions() {
    const patients = this.state.getPendingPatients();
    if (patients.length === 0) {
      this.dom.triagePatient.innerHTML = `<option value="">Nenhum paciente cadastrado</option>`;
      return;
    }
    this.dom.triagePatient.innerHTML = `<option value="">Selecionar paciente</option>` + patients.map((patient) => `
      <option value="${patient.id}">${patient.firstName}</option>
    `).join("");
    this.dom.triagePatient.value = this.state.selectedPatientId;
  }

  renderPatientSummary() {
    const patient = this.state.getSelectedPatient();
    if (!patient) {
      this.dom.patientSummary.innerHTML = `<div class="empty-state">Selecione um paciente para ver o resumo.</div>`;
      return;
    }
    this.dom.patientSummary.innerHTML = `
      <div class="summary-row"><span>Nome</span><strong>${this.state.getPatientName(patient)}</strong></div>
      <div class="summary-row"><span>Idade</span><strong>${patient.age}</strong></div>
      <div class="summary-row"><span>Gênero</span><strong>${patient.gender}</strong></div>
      <div class="summary-row"><span>Convênio</span><strong>${patient.insuranceName}</strong></div>
      <div class="summary-row"><span>Plano</span><strong>${patient.insurancePlan}</strong></div>
    `;
  }

  renderVitalPreview() {
    const pressure = document.getElementById("bloodPressure").value || "--";
    const temperature = document.getElementById("temperature").value || "--";
    const oxygen = document.getElementById("oxygen").value || "--";
    const oxygenNumber = Number(oxygen);
    const oxygenClass = oxygenNumber < 90 ? "alert" : "";
    this.dom.vitalPreview.innerHTML = `
      <div class="vital-row"><span>Pressão</span><strong>${pressure}</strong></div>
      <div class="vital-row"><span>Temperatura</span><strong>${temperature} °C</strong></div>
      <div class="vital-row"><span>Oxigenação</span><strong class="${oxygenClass}">${oxygen}%</strong></div>
    `;
  }
}

window.TriageController = TriageController;

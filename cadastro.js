class PatientRegistration {
  constructor(state, dom, callbacks) {
    this.state = state;
    this.dom = dom;
    this.callbacks = callbacks;
    this.fieldNames = [
      "firstName",
      "lastName",
      "age",
      "gender",
      "address",
      "insurancePlan",
      "insuranceName",
      "insuranceCard",
      "insuranceValidUntil"
    ];
  }

  init() {
    this.dom.patientForm.addEventListener("submit", (event) => this.handleSubmit(event));
    this.dom.clearPatientForm.addEventListener("click", () => this.reset());
    this.dom.patientSearch.addEventListener("input", () => this.render());
    this.dom.patientList.addEventListener("click", (event) => this.handleListClick(event));
    this.getField("insurancePlan")?.addEventListener("change", () => this.syncInsuranceFields());

    this.fieldNames.forEach((fieldName) => {
      const field = this.dom.patientForm.elements.namedItem(fieldName);
      if (!field) {
        return;
      }
      field.addEventListener("input", () => {
        this.enforceFieldInput(fieldName);
        this.validateField(fieldName);
      });
      field.addEventListener("blur", () => this.validateField(fieldName));
    });

    this.syncInsuranceFields();
  }

  getField(fieldName) {
    return this.dom.patientForm.elements.namedItem(fieldName);
  }

  getErrorElement(fieldName) {
    return this.dom.patientForm.querySelector(`[data-error-for="${fieldName}"]`);
  }

  setFieldState(fieldName, message) {
    const field = this.getField(fieldName);
    const errorElement = this.getErrorElement(fieldName);
    if (field) {
      field.classList.toggle("input-error", Boolean(message));
      field.setAttribute("aria-invalid", message ? "true" : "false");
    }
    if (errorElement) {
      errorElement.textContent = message || "";
    }
    return !message;
  }

  normalizeText(value) {
    return String(value || "").trim();
  }

  isValidName(value) {
    return /^[A-Za-zÀ-ÿ' -]+$/.test(value);
  }

  enforceFieldInput(fieldName) {
    const field = this.getField(fieldName);
    if (!field) {
      return;
    }

    const cleaners = {
      firstName: (value) => value.replace(/[^A-Za-zÀ-ÿ' -]/g, ""),
      lastName: (value) => value.replace(/[^A-Za-zÀ-ÿ' -]/g, ""),
      age: (value) => value.replace(/[^\d]/g, ""),
      address: (value) => value.replace(/[^A-Za-zÀ-ÿ0-9' .,\-/#º°]/g, ""),
      insuranceName: (value) => value.replace(/[^A-Za-zÀ-ÿ' &.-]/g, ""),
      insuranceCard: (value) => value.replace(/[^A-Za-z0-9-]/g, "")
    };

    const cleaner = cleaners[fieldName];
    if (cleaner) {
      const cleaned = cleaner(field.value);
      if (cleaned !== field.value) {
        field.value = cleaned;
      }
    }
  }

  isSUSSelected() {
    return this.normalizeText(this.getField("insurancePlan")?.value) === "SUS";
  }

  syncInsuranceFields() {
    const susSelected = this.isSUSSelected();
    const insuranceFields = ["insuranceName", "insuranceCard", "insuranceValidUntil"];

    insuranceFields.forEach((fieldName) => {
      const field = this.getField(fieldName);
      if (!field) {
        return;
      }
      field.disabled = susSelected;
      field.required = !susSelected;
      if (susSelected) {
        field.value = "";
        this.setFieldState(fieldName, "");
      }
    });

    this.validateField("insurancePlan");
  }

  validateField(fieldName) {
    const value = this.normalizeText(this.getField(fieldName)?.value);

    switch (fieldName) {
      case "firstName":
        if (!value) {
          return this.setFieldState(fieldName, "Informe o nome.");
        }
        if (value.length < 2) {
          return this.setFieldState(fieldName, "O nome deve ter pelo menos 2 caracteres.");
        }
        if (!this.isValidName(value)) {
          return this.setFieldState(fieldName, "Use apenas letras no nome.");
        }
        return this.setFieldState(fieldName, "");
      case "lastName":
        if (!value) {
          return this.setFieldState(fieldName, "Informe o sobrenome.");
        }
        if (value.length < 2) {
          return this.setFieldState(fieldName, "O sobrenome deve ter pelo menos 2 caracteres.");
        }
        if (!this.isValidName(value)) {
          return this.setFieldState(fieldName, "Use apenas letras no sobrenome.");
        }
        return this.setFieldState(fieldName, "");
      case "age": {
        if (!value) {
          return this.setFieldState(fieldName, "Informe a idade.");
        }
        if (!/^\d+$/.test(value)) {
          return this.setFieldState(fieldName, "A idade deve conter apenas números.");
        }
        const age = Number(value);
        if (age < 0 || age > 130) {
          return this.setFieldState(fieldName, "Informe uma idade entre 0 e 130 anos.");
        }
        return this.setFieldState(fieldName, "");
      }
      case "gender":
        if (!value) {
          return this.setFieldState(fieldName, "Selecione o gênero do paciente.");
        }
        return this.setFieldState(fieldName, "");
      case "address":
        if (!value) {
          return this.setFieldState(fieldName, "Informe o endereço.");
        }
        if (value.length < 5) {
          return this.setFieldState(fieldName, "O endereço parece incompleto.");
        }
        return this.setFieldState(fieldName, "");
      case "insuranceName":
        if (this.isSUSSelected()) {
          return this.setFieldState(fieldName, "");
        }
        if (!value) {
          return this.setFieldState(fieldName, "Informe o convênio.");
        }
        if (value.length < 2) {
          return this.setFieldState(fieldName, "O convênio deve ter pelo menos 2 caracteres.");
        }
        return this.setFieldState(fieldName, "");
      case "insuranceCard":
        if (this.isSUSSelected()) {
          return this.setFieldState(fieldName, "");
        }
        if (!value) {
          return this.setFieldState(fieldName, "Informe o número da carteirinha.");
        }
        if (!/^[A-Za-z0-9-]{4,}$/.test(value)) {
          return this.setFieldState(fieldName, "A carteirinha deve ter ao menos 4 caracteres e pode usar letras, números ou hífen.");
        }
        return this.setFieldState(fieldName, "");
      case "insuranceValidUntil": {
        if (this.isSUSSelected()) {
          return this.setFieldState(fieldName, "");
        }
        if (!value) {
          return this.setFieldState(fieldName, "Informe a validade do convênio.");
        }
        const now = new Date();
        const [year, month] = value.split("-").map(Number);
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          return this.setFieldState(fieldName, "A validade do convênio está vencida.");
        }
        return this.setFieldState(fieldName, "");
      }
      case "insurancePlan":
        if (!value) {
          return this.setFieldState(fieldName, "Selecione o plano.");
        }
        return this.setFieldState(fieldName, "");
      default:
        return true;
    }
  }

  validateAllFields() {
    const invalidFields = [];
    const fieldsToValidate = this.isSUSSelected()
      ? ["firstName", "lastName", "age", "gender", "address", "insurancePlan"]
      : this.fieldNames;

    fieldsToValidate.forEach((fieldName) => {
      if (!this.validateField(fieldName)) {
        invalidFields.push(fieldName);
      }
    });
    if (invalidFields.length > 0) {
      const firstInvalid = this.getField(invalidFields[0]);
      if (firstInvalid) {
        firstInvalid.focus();
      }
      return false;
    }
    return true;
  }

  handleSubmit(event) {
    event.preventDefault();
    if (!this.validateAllFields()) {
      this.callbacks.showMessage(this.dom.patientMessage, "Corrija os campos destacados antes de cadastrar.");
      return;
    }

    const data = new FormData(this.dom.patientForm);
    const patient = {
      id: crypto.randomUUID(),
      firstName: this.normalizeText(data.get("firstName")),
      lastName: this.normalizeText(data.get("lastName")),
      age: Number(data.get("age")),
      gender: data.get("gender"),
      address: this.normalizeText(data.get("address")),
      insuranceName: this.isSUSSelected() ? "SUS" : this.normalizeText(data.get("insuranceName")),
      insuranceCard: this.isSUSSelected() ? "" : this.normalizeText(data.get("insuranceCard")),
      insuranceValidUntil: this.isSUSSelected() ? "" : data.get("insuranceValidUntil"),
      insurancePlan: data.get("insurancePlan"),
      triageStatus: "aguardando",
      createdAt: new Date().toISOString()
    };

    this.state.patients.push(patient);
    this.state.selectedPatientId = patient.id;
    this.state.save();
    this.reset();
    this.callbacks.showSuccessTransition("Cadastro concluído", "triagem");
  }

  handleListClick(event) {
    const selectButton = event.target.closest("[data-select-patient]");
    const deleteButton = event.target.closest("[data-delete-patient]");
    if (selectButton) {
      this.state.selectedPatientId = selectButton.dataset.selectPatient;
      this.callbacks.setScreen("triagem");
      this.callbacks.renderAll();
    }
    if (deleteButton) {
      const index = Number(deleteButton.dataset.deletePatient);
      const removed = this.state.patients.splice(index, 1)[0];
      if (removed) {
        this.state.triages = this.state.triages.filter((triage) => triage.patientId !== removed.id);
      }
      this.state.save();
      this.callbacks.renderAll();
    }
  }

  reset() {
    this.dom.patientForm.reset();
    this.fieldNames.forEach((fieldName) => this.setFieldState(fieldName, ""));
    this.syncInsuranceFields();
  }

  render() {
    const search = this.dom.patientSearch.value;
    const patients = this.state.getPendingPatients().filter((patient) => patient.firstName.includes(search));
    if (patients.length === 0) {
      this.dom.patientList.innerHTML = `<div class="empty-state">Nenhum paciente aguardando triagem.</div>`;
      return;
    }
    this.dom.patientList.innerHTML = patients.map((patient, index) => `
      <article class="patient-card">
        <header>
          <div>
            <strong>${this.state.getPatientName(patient)}</strong>
            <small>${patient.age} anos Â· ${patient.gender}</small>
          </div>
          <span class="tag">${patient.insurancePlan}</span>
        </header>
        <div class="meta-line">${patient.address}</div>
        <div class="meta-line">${patient.insuranceName} Â· ${patient.insuranceCard}</div>
        <div class="patient-actions">
          <button class="small-button" data-select-patient="${patient.id}" type="button">Triar</button>
          <button class="small-button danger-button" data-delete-patient="${index}" type="button">Remover</button>
        </div>
      </article>
    `).join("");
  }
}

window.PatientRegistration = PatientRegistration;

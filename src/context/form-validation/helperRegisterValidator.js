import { validateRut } from '@fdograph/rut-utilities'

// Función para definir los campos obligatorios.
function setMandatoryFields(values) {

  // Los campos a definir si son obligatorios o no son:
  // firstName, fatherLastName, motherLastName, email, company, role
  // rut, phone, plant, engineering, shift, opshift, subtype

  // Primero, se define los campos que siempre serán obligatorios.
  const mandatoryFields = ['firstName', 'fatherLastName', 'email', 'company', 'role']

  // Ahora se definirá, caso por caso, para los campos "no obligatorios" si deben serlo o no.

  // rut
  //
  // Ya NO es obligatorio. Lo era solo para la empresa Procure, y dejaba fuera
  // la creacion de cualquier persona cuyo RUT no se tuviera a mano en ese
  // momento -contratistas, gente nueva, alguien que se suma a mitad de una OT-.
  //
  // La VALIDACION se mantiene: si se escribe un RUT, tiene que ser valido. Lo
  // que se quito es la obligacion de escribirlo, que es otra cosa.

  // phone
  // No será obligatorio

  // plant
  if (values.role === 2 || values.role === 3) {
    mandatoryFields.push('plant')
  }

  // engineering
  // No será obligatorio

  // shift
  if (values.company === 'Procure') {
    if (values.role === 7 || values.role === 8) {
      mandatoryFields.push('shift')
    }
  } else if (values.company === 'MEL') {
    if (values.role === 2) {
      mandatoryFields.push('shift')
    }
  }

  // opshift
  // No será obligatorio

  // subtype
  if (values.company === 'Procure') {
    mandatoryFields.push('shift')
  }

  return mandatoryFields

}

export function registerValidator(values) {
  const valName = /^[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s]+$/
  const valEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const valPhone = /^[0-9+]{8,12}$/
  const valCompany = ['Procure', 'MEL']
  const valRoleMel = [2, 3, 4]
  const valRoleProcure = [1, 5, 6, 7, 8, 9, 10, 11, 12]
  const valShiftMel = ['P', 'Q']
  const valShiftProcure = ['A', 'B']
  const valSubtype = ['Teletrabajo', 'Terreno', 'Oficina']

  const valPlant = [
    'Planta Concentradora Los Colorados',
    'Planta Concentradora Laguna Seca | Línea 1',
    'Planta Concentradora Laguna Seca | Línea 2',
    'Chancado y Correas',
    'Puerto Coloso',
    'Instalaciones Cátodo',
    'Sucursal Santiago',
    'Instalaciones Mina',
    'Instalaciones Lixiviación Sulfuros',
    'Instalaciones Escondida Water Supply',
    'Instalaciones Concentraducto',
    'Instalaciones Monturaqui',
    'Instalaciones Auxiliares',
    'Subestaciones Eléctricas',
    'Tranque y Relaves',
    'Campamento Villa San Lorenzo',
    'Campamento Villa Cerro Alegre'
  ]

  // Objeto que contiene reglas de validación para cada campo. Cada campo tiene dos propiedades:
  // validate: Una función que evalúa si el valor es válido. Retorna `true` si pasa la validación y `false` en caso contrario.
  // message: Mensaje de error que se mostrará al usuario si la validación falla.
  const validations = {
    // name: {
    //   validate: value => valName.test(value),
    //   message: 'El nombre debe contener solo letras y espacios en blanco.'
    // },
    firstName: {
      validate: value => valName.test(value),
      message: 'El nombre debe contener solo letras y espacios en blanco.'
    },
    fatherLastName: {
      validate: value => valName.test(value),
      message: 'El apellido paterno debe contener solo letras y espacios en blanco.'
    },
    motherLastName: {
      validate: value => valName.test(value),
      message: 'El apellido materno debe contener solo letras y espacios en blanco.'
    },
    email: {
      validate: value => valEmail.test(value),
      message: 'El correo no cumple con el formato requerido.'
    },
    phone: {
      validate: value => valPhone.test(value.replace(/\s/g, '')),
      message: 'El teléfono solo recibe campos numéricos y debe tener 8-12 caracteres.'
    },
    rut: {
      validate: value => validateRut(value),
      message: 'El RUT no cumple con la validación del dígito verificador.'
    },
    company: {
      validate: value => valCompany.includes(value),
      message: 'Debe seleccionar solo las Empresas sugeridas.'
    },
    role: {
      validate: value => {
        if (values.company === 'MEL') {

          return valRoleMel.includes(value)

        } else if (values.company === 'Procure') {

          return valRoleProcure.includes(value)

        } else {

          return true

        }
      },
      message: 'El Rol seleccionado no se encuentra entre los sugeridos para la empresa seleccionada.'
    },
    subtype: {
      validate: value => valSubtype.includes(value),
      message: 'Debe seleccionar un subtipo de formato de trabajo para usuarios Procure.'
    },
    plant: {
      validate: value => valPlant.includes(...value),
      message: 'La Planta seleccionada no coincide con ninguna de las sugeridas.'
    },
    shift: {
      validate: value => {

        if (values.company === 'Procure') {
          if (values.role === 7 || values.role === 8) {

            return valShiftProcure.includes(...value)

          } else {

            return true

          }
        } else if (values.company === 'MEL') {
          if (values.role === 2) {

            return valShiftMel.includes(...value)

          } else {

            return true

          }
        } else {

          return true

        }
      },
      message: 'El Turno seleccionado no se encuentra entre los sugeridos para la empresa seleccionada.'
    }
  }

  const mandatoryFields = setMandatoryFields(values)

  for (const key in values) {

    // Primera validación: General.
    // Si el campo es obligatorio y su valor es falsy ('', null, undefined, etc)
    if (mandatoryFields.includes(key) && !Boolean(values[key])) {
      throw new Error('Debes rellenar todos los campos. ' + `Error en campo ${key} `)
    }

    // Segunda validación: Específica.
    // Si el campo es obligatorio y existe dentro de validations.
    if (mandatoryFields.includes(key) && validations.hasOwnProperty(key)) {
      const { validate, message } = validations[key]
      if (!validate(values[key])) {
        throw new Error(message)
      }
    }
  }
}

import { AbilityBuilder, Ability } from '@casl/ability'

export const AppAbility = Ability

// Se definen las reglas que regirán para cada uno de los roles que existen en el sistema
// Es importante que can sea igual a 'manage' para que no se caiga el sistema
const defineRulesFor = (role, subject) => {
  const { can, rules } = new AbilityBuilder(AppAbility)
  if (role === 1) {
    can('manage', 'all')
  } else if (role === 2) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'nueva-solicitud', 'solicitudes', 'user-profile'])
  } else if (role === 3) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'nueva-solicitud', 'solicitudes', 'user-profile'])
  } else if (role === 4) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'solicitudes', 'user-profile'])
  } else if (role === 5) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'solicitudes', 'user-profile'])
  } else if (role === 6) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'solicitudes', 'user-profile'])
  } else if (role === 7) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'solicitudes', 'user-profile'])
  } else if (role === 8) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'solicitudes', 'user-profile'])
  } else if (role === 9) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'user-profile'])
  } else if (role === 10) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'user-profile'])
  } else {
    can('manage', subject)
  }

  return rules
}

export const buildAbilityFor = (role, subject) => {
  return new AppAbility(defineRulesFor(role, subject), {
    // https://casl.js.org/v5/en/guide/subject-type-detection
    // @ts-ignore
    detectSubjectType: object => object.type
  })
}

export const defaultACLObj = {
  action: 'manage',
  subject: 'all'
}

export default defineRulesFor
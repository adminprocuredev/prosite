import { Ability, AbilityBuilder } from '@casl/ability'

export const AppAbility = Ability

// Se definen las reglas que regirán para cada uno de los roles que existen en el sistema
// Es importante que can sea igual a 'manage' para que no se caiga el sistema
const defineRulesFor = (role, subject) => {
  const { can, rules } = new AbilityBuilder(AppAbility)
  if (role === 1) {
    can('manage', 'all')
  } else if (role === 2) {
    can('manage', [
      'calendario',
      'home',
      'mapa',
      'nuestro-equipo',
      'nueva-solicitud',
      'solicitudes',
      'user-profile',
      'documentos'
    ])
  } else if (role === 3) {
    can('manage', [
      'calendario',
      'home',
      'mapa',
      'nuestro-equipo',
      'nueva-solicitud',
      'solicitudes',
      'user-profile',
      'documentos'
    ])
  } else if (role === 4) {
    can('manage', [
      'calendario',
      'home',
      'mapa',
      'nuestro-equipo',
      'solicitudes',
      'user-profile',
      'documentos',
      'gabinete'
    ])
  } else if (role === 5) {
    can('manage', [
      'calendario',
      'home',
      'mapa',
      'nuestro-equipo',
      'nueva-solicitud',
      'solicitudes',
      'user-profile',
      'documentos',
      'gabinete',
      'carga-de-horas',
      'centros-de-costo'
    ])
  } else if (role === 6) {
    can('manage', [
      'calendario',
      'home',
      'mapa',
      'nuestro-equipo',
      'solicitudes',
      'user-profile',
      'documentos',
      'gabinete',
      'carga-de-horas',
      'centros-de-costo'
    ])
  } else if (role === 7) {
    can('manage', [
      'calendario',
      'home',
      'mapa',
      'nuestro-equipo',
      'nueva-solicitud',
      'solicitudes',
      'user-profile',
      'levantamientos',
      'documentos',
      'gabinete',
      'carga-de-horas'
    ])
  } else if (role === 8) {
    can('manage', [
      'calendario',
      'home',
      'mapa',
      'nuestro-equipo',
      'solicitudes',
      'user-profile',
      'documentos',
      'levantamientos',
      'gabinete',
      'carga-de-horas'
    ])
  } else if (role === 9) {
    can('manage', [
      'calendario',
      'home',
      'mapa',
      'nuestro-equipo',
      'user-profile',
      'documentos',
      'solicitudes',
      'gabinete',
      'carga-de-horas'
    ])
  } else if (role === 10) {
    can('manage', [
      'calendario',
      'home',
      'mapa',
      'nuestro-equipo',
      'user-profile',
      'documentos',
      'solicitudes',
      'levantamientos',
      'gabinete',
      'carga-de-horas',
      'centros-de-costo'
    ])
  } else if (role === 11) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'user-profile', 'carga-de-horas'])
  } else if (role === 12) {
    can('manage', ['calendario', 'home', 'mapa', 'nuestro-equipo', 'user-profile', 'carga-de-horas'])
  }

  // Antes habia un `else { can('manage', subject) }`: cualquier rol fuera del
  // 1-12 —un documento sin campo `role`, un 13, o un valor de texto como "1" en
  // vez del numero 1— recibia el permiso que pidiera. Un ACL que falla abierto
  // no es un ACL. Sin rol conocido no se concede nada y el usuario ve la
  // pantalla de "no autorizado", que es informacion util en vez de acceso.

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

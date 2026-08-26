// lib/certs/fnmt-ac-componentes-informaticos.ts
// Certificado de la CA intermedia "AC Componentes Informáticos" (FNMT-RCM,
// la Fábrica Nacional de Moneda y Timbre — autoridad certificadora del
// Estado español). Es la que firma el certificado TLS de
// hospedajes.pre-ses.mir.es / hospedajes.ses.mir.es (SES.HOSPEDAJES).
//
// Por qué hace falta: el servidor de Interior no manda esta CA intermedia
// en el handshake TLS (solo el certificado hoja) — Windows la completa solo
// automáticamente (por eso funciona desde un navegador o desde PowerShell en
// Windows), pero Node.js no lo hace, así que cualquier llamada desde un
// entorno Node "limpio" (como las funciones serverless de Vercel) falla con
// "UNABLE_TO_VERIFY_LEAF_SIGNATURE" / "unable to verify the first
// certificate". No es un fallo nuestro ni del certificado en sí — es que al
// cliente le falta este eslabón de la cadena para completarla hasta la raíz
// (AC RAIZ FNMT-RCM, que sí está en el almacén de confianza por defecto de
// Node/Mozilla).
//
// Se usa junto a las raíces por defecto de Node (tls.rootCertificates) en
// ses.service.ts — no sustituye la lista de confianza del sistema, solo la
// completa para poder verificar este dominio en concreto.
//
// Fuente oficial (público, es la CA que hay que instalar para confiar en
// certificados FNMT de componente): https://www.sede.fnmt.gob.es/descargas/certificados-raiz-de-la-fnmt
// Vigencia del certificado: hasta 2028-06-24.
export const FNMT_AC_COMPONENTES_INFORMATICOS_PEM = `-----BEGIN CERTIFICATE-----
MIIG1jCCBL6gAwIBAgIQNMarBE42mRJRyCULbJTWwDANBgkqhkiG9w0BAQsFADA7
MQswCQYDVQQGEwJFUzERMA8GA1UECgwIRk5NVC1SQ00xGTAXBgNVBAsMEEFDIFJB
SVogRk5NVC1SQ00wHhcNMTMwNjI0MTA1MjU5WhcNMjgwNjI0MTA1MjU5WjBHMQsw
CQYDVQQGEwJFUzERMA8GA1UECgwIRk5NVC1SQ00xJTAjBgNVBAsMHEFDIENvbXBv
bmVudGVzIEluZm9ybcOhdGljb3MwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQCXVx8rdbF7/xY44CaSqzzGo5BhvzA8knxC/3KJYVzTf+CkOvMxMUDub8b0
h38MDujm/RKZhBNOWbKhxF3U61ZVhcR9xOCciuS/soT80m3BByxAKcZsNka0jCA4
XRkglDaAFxCHEZ06MOnvXsSOZDfPYahbQ3VFCVycJuhlHdAwSpmceQwcRYkR6YgX
wTiyzCNGivMKAmRS3dItqDOmDW/nxiDFq/Jd8VWY7GFkwbbAeqYId8FjN8zfvafu
nsB9SLFkUjPPMeqfmC7Bdh7HMxLpaOXROwH201cmlebiPkn0xSFxXFqwhhr6yN8U
QYZ3O/+xdHLrS6DS9+CJUF6d09ijAgMBAAGjggLIMIICxDASBgNVHRMBAf8ECDAG
AQH/AgEAMA4GA1UdDwEB/wQEAwIBBjAdBgNVHQ4EFgQUGfhYLxTWpsybBJgIDUzX
qwCng2UwgZgGCCsGAQUFBwEBBIGLMIGIMEkGCCsGAQUFBzABhj1odHRwOi8vb2Nz
cGZubXRyY21jYS5jZXJ0LmZubXQuZXMvb2NzcGZubXRyY21jYS9PY3NwUmVzcG9u
ZGVyMDsGCCsGAQUFBzAChi9odHRwOi8vd3d3LmNlcnQuZm5tdC5lcy9jZXJ0cy9B
Q1JBSVpGTk1UUkNNLmNydDAfBgNVHSMEGDAWgBT3fcX9xOiaG3dkp/UdoMy/h2Ca
bTCB6wYDVR0gBIHjMIHgMIHdBgRVHSAAMIHUMCkGCCsGAQUFBwIBFh1odHRwOi8v
d3d3LmNlcnQuZm5tdC5lcy9kcGNzLzCBpgYIKwYBBQUHAgIwgZkMgZZTdWpldG8g
YSBsYXMgY29uZGljaW9uZXMgZGUgdXNvIGV4cHVlc3RhcyBlbiBsYSBEZWNsYXJh
Y2nDs24gZGUgUHLDoWN0aWNhcyBkZSBDZXJ0aWZpY2FjacOzbiBkZSBsYSBGTk1U
LVJDTSAoIEMvIEpvcmdlIEp1YW4sIDEwNi0yODAwOS1NYWRyaWQtRXNwYcOxYSkw
gdQGA1UdHwSBzDCByTCBxqCBw6CBwIaBkGxkYXA6Ly9sZGFwZm5tdC5jZXJ0LmZu
bXQuZXMvQ049Q1JMLE9VPUFDJTIwUkFJWiUyMEZOTVQtUkNNLE89Rk5NVC1SQ00s
Qz1FUz9hdXRob3JpdHlSZXZvY2F0aW9uTGlzdDtiaW5hcnk/YmFzZT9vYmplY3Rj
bGFzcz1jUkxEaXN0cmlidXRpb25Qb2ludIYraHR0cDovL3d3dy5jZXJ0LmZubXQu
ZXMvY3Jscy9BUkxGTk1UUkNNLmNybDANBgkqhkiG9w0BAQsFAAOCAgEAo2bsQ2xL
Dcyodieqjd+uy/lfxDw/MbrAq/ZaNFkIlcypUYamOM4vrm5rz8oLjPCoLkJ48P+n
P08Gkcl5Q6q6VFcZLia+U3gfHXrkyqToQlrtViGCGH3xA4u56XtMHGXSdk9vQ0yD
nW5f7bUEkp+uvcKewrOvNcpbIAgD4eU7gdOS0w7BagcFRBgTKBw2s3z73fRZtouJ
g/atmWYtXbBsfNjph+pCh+h5sbSyZUVzO5AemyjpYYYNMWDQrTXq+7O8zIPuPaNE
SjEexuzn+VjHG90RlUK1LygARi+Ir0opD2w6erb/hK8Eea7MFdKQ2ASqNBGJggNo
5vfPVvjHiL+Antmh7mQSKL+4YwFU64d4KK9k0C1mbJethDQFKcjTK1vMvnXFiups
IuyTqwKauo7u2zMKzY4r3VYOW9TpMyLPFIY8pII5GyNzXlL0F4nscOvduTEPEYqx
eNJfpDDPY/DO8WfxgdRTy2W3D/UoAulb+Y+nuzGGCtFQrsSMQX487R+aY0nWot/h
ajef6BcPuxhDfQrg5IafrISVmcJAplb3tXhh0sz7RbYz6jf1bke4eU5fnrTMtGlV
teUL2vjrfUPHW07kBJuaQ7sxORNV3bpHisOnHj+AriQzCn5vINpSHW6hTm7IfRkb
ltu/aQrsMuUhP7HE/v+uXe5CuboV5ubZhHU=
-----END CERTIFICATE-----
`;

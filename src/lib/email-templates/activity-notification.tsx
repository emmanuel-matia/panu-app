import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props { message?: string; actionUrl?: string }

const ActivityNotification = ({ message, actionUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{message || 'Nouvelle activité sur votre compte PANU'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouvelle notification</Heading>
        <Text style={text}>{message || 'Il y a du nouveau sur votre compte PANU.'}</Text>
        <Button style={button} href={actionUrl || 'https://panu.site/notifications'}>Voir sur PANU</Button>
        <Text style={muted}>PANU – Plateforme Africaine Numérique</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ActivityNotification,
  subject: 'Nouvelle notification PANU',
  displayName: 'Notification d’activité',
  previewData: { message: 'Vous avez un nouvel abonné.', actionUrl: 'https://panu.site/notifications' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '520px' }
const h1 = { fontSize: '22px', color: '#14163a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333a55', lineHeight: '24px' }
const muted = { fontSize: '12px', color: '#8a8fa8', marginTop: '24px' }
const button = { backgroundColor: '#7c3aed', color: '#ffffff', borderRadius: '10px', padding: '12px 22px', fontWeight: 'bold', textDecoration: 'none' }

import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props { hostName?: string; liveTitle?: string; liveUrl?: string }

const LiveInvitation = ({ hostName, liveTitle, liveUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`${hostName || 'Un créateur'} vous invite sur son direct PANU`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Invitation au direct</Heading>
        <Text style={text}>{hostName || 'Un créateur'} vous invite à rejoindre son direct{liveTitle ? ` « ${liveTitle} »` : ''} sur PANU.</Text>
        <Button style={button} href={liveUrl || 'https://panu.site/live'}>Rejoindre le direct</Button>
        <Text style={muted}>PANU – Plateforme Africaine Numérique</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LiveInvitation,
  subject: (d: Record<string, any>) => `${d.hostName || 'Un créateur'} vous invite sur son direct PANU`,
  displayName: 'Invitation au direct',
  previewData: { hostName: 'Emmanuel', liveTitle: 'Direct PANU', liveUrl: 'https://panu.site/live' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '520px' }
const h1 = { fontSize: '22px', color: '#14163a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333a55', lineHeight: '24px' }
const muted = { fontSize: '12px', color: '#8a8fa8', marginTop: '24px' }
const button = { backgroundColor: '#7c3aed', color: '#ffffff', borderRadius: '10px', padding: '12px 22px', fontWeight: 'bold', textDecoration: 'none' }

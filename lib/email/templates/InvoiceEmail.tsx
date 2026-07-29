// lib/email/templates/InvoiceEmail.tsx
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from "@react-email/components";
import { ESTABLISHMENT } from "@/lib/establishment";

export interface InvoiceEmailProps {
  guestFirstName: string;
  invoiceNumber: string;
  totalAmount: string;
}

export function InvoiceEmail({ guestFirstName, invoiceNumber, totalAmount }: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu factura {invoiceNumber}</Preview>
      <Body style={{ fontFamily: "Georgia, serif", backgroundColor: "#fafaf9", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", border: "1px solid #e7e5e4" }}>
          <Heading style={{ fontSize: "20px", color: "#1c1917" }}>{ESTABLISHMENT.name}</Heading>
          <Text>Hola {guestFirstName},</Text>
          <Text>
            Adjuntamos tu factura <strong>{invoiceNumber}</strong> por un importe de{" "}
            <strong>{totalAmount}</strong>.
          </Text>
          <Hr />
          <Text style={{ fontSize: "12px", color: "#78716c" }}>
            {ESTABLISHMENT.name}
            {ESTABLISHMENT.phone ? ` · ${ESTABLISHMENT.phone}` : ""}
            {ESTABLISHMENT.email ? ` · ${ESTABLISHMENT.email}` : ""}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InvoiceEmail;

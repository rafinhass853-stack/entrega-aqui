import React from "react";
import { Layout } from "./Menu";

export default function ComissaoPlataforma({ user, isMobile }) {
  return (
    <Layout isMobile={isMobile} user={user}>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC"
        }}
      >
        <h2 style={{ color: "#0F3460", fontWeight: 900 }}>
          🚧 Tela em desenvolvimento
        </h2>
      </div>
    </Layout>
  );
}

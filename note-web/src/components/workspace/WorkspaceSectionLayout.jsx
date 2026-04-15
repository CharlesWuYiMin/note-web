import React from 'react'
import { Button, Card, Space, Tag, Typography } from 'antd'

const { Title, Text, Paragraph } = Typography

function WorkspaceSectionLayout({
  title,
  subtitle,
  description,
  icon,
  accent = 'var(--primary)',
  actions = [],
  tabs = [],
  stats = [],
  main,
  side,
  footer,
}) {
  return (
    <div className="workspace-page">
      <div className="workspace-page__glow workspace-page__glow--one" />
      <div className="workspace-page__glow workspace-page__glow--two" />

      <div className="workspace-page__inner">
        <Card className="workspace-hero" styles={{ body: { padding: 0 } }}>
          <div className="workspace-hero__inner">
            <div className="workspace-hero__copy">
              <Space size={12} align="center" style={{ marginBottom: 12 }}>
                <div
                  className="workspace-hero__icon"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, #8fb4ff)`,
                  }}
                >
                  {icon}
                </div>
                <Tag color="blue" style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                  Cloud Notes
                </Tag>
              </Space>

              <Title level={2} style={{ margin: '0 0 8px', color: '#10223a' }}>
                {title}
              </Title>
              <Paragraph style={{ margin: 0, color: 'rgba(16,34,58,0.72)', fontSize: 14 }}>
                {subtitle}
              </Paragraph>
              {description && (
                <Paragraph style={{ margin: '12px 0 0', color: 'rgba(16,34,58,0.58)', maxWidth: 720 }}>
                  {description}
                </Paragraph>
              )}
            </div>

            <div className="workspace-hero__actions">
              {actions.map((action) => (
                <Button
                  key={action.key}
                  type={action.primary ? 'primary' : 'default'}
                  icon={action.icon}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  size="large"
                  style={action.primary ? {
                    background: `linear-gradient(135deg, ${accent}, #4c86ff)`,
                    border: 'none',
                    boxShadow: '0 10px 24px rgba(0,97,164,0.22)',
                  } : undefined}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {tabs.length > 0 && (
          <div className="workspace-tabs">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                type={tab.active ? 'primary' : 'text'}
                icon={tab.icon}
                onClick={tab.onClick}
                size="middle"
                style={tab.active ? {
                  background: accent,
                  borderColor: accent,
                  boxShadow: '0 8px 20px rgba(0,97,164,0.18)',
                } : {
                  color: 'rgba(16,34,58,0.72)',
                }}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        )}

        {stats.length > 0 && (
          <div className="workspace-stats">
            {stats.map((stat) => (
              <Card key={stat.key} className="workspace-stat" styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <Text style={{ fontSize: 12, color: 'rgba(16,34,58,0.52)' }}>{stat.label}</Text>
                    <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: '#10223a' }}>
                      {stat.value}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: stat.badgeBackground || 'rgba(0,97,164,0.08)',
                      color: stat.badgeColor || accent,
                      fontSize: 20,
                    }}
                  >
                    {stat.icon}
                  </div>
                </div>
                {stat.hint && (
                  <Paragraph style={{ margin: '10px 0 0', color: 'rgba(16,34,58,0.54)', fontSize: 13 }}>
                    {stat.hint}
                  </Paragraph>
                )}
              </Card>
            ))}
          </div>
        )}

        <div className="workspace-content-grid">
          <Card className="workspace-panel workspace-panel--main" styles={{ body: { padding: 0 } }}>
            {main}
          </Card>

          {side && (
            <Card className="workspace-panel workspace-panel--side" styles={{ body: { padding: 0 } }}>
              {side}
            </Card>
          )}
        </div>

        {footer && (
          <div className="workspace-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkspaceSectionLayout

import React from "react";
import { Card, Button, Typography, Space, Badge, Tooltip } from "antd";
import { DeleteOutlined, StopOutlined } from "@ant-design/icons";
import { TrackerLine } from "../types/tracker.ts";

const { Title, Text } = Typography;

interface TrackerLineCardProps {
  line: TrackerLine;
  liveDuration?: string;
  onDelete: (line: TrackerLine) => void;
  onStop?: (line: TrackerLine) => void;
  formatDuration: (startedAt: string, endedAt: string | null) => string;
  formatTime: (dateString: string) => string;
}

export const TrackerLineCard: React.FC<TrackerLineCardProps> = ({
  line,
  liveDuration,
  onDelete,
  onStop,
  formatDuration,
  formatTime,
}) => {
  const isActive = line.ended_at === null;

  return (
    <Card
      size="small"
      style={{
        width: "100%",
        border: isActive ? "2px solid #52c41a" : undefined,
        backgroundColor: isActive ? "#f6ffed" : undefined,
      }}
      extra={
        <Tooltip title="Delete entry">
          <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => onDelete(line)} danger />
        </Tooltip>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="small">
        <Title level={5} style={{ margin: 0 }}>
          {line.desc}
        </Title>

        <Space direction="vertical" size="small">
          <Text type="secondary">Started: {formatTime(line.started_at)}</Text>
          {line.ended_at && <Text type="secondary">Ended: {formatTime(line.ended_at)}</Text>}
        </Space>

        {line.ended_at ? (
          <Text strong>Duration: {formatDuration(line.started_at, line.ended_at)}</Text>
        ) : (
          <Card size="small" style={{ backgroundColor: "#f6ffed", border: "1px solid #b7eb8f" }}>
            <Space direction="vertical" style={{ width: "100%" }} size="small">
              <Space>
                <Badge status="processing" />
                <Text
                  strong
                  style={{
                    color: "#52c41a",
                    animation: "pulse 2s infinite",
                  }}
                >
                  Live: {liveDuration || formatDuration(line.started_at, null)}
                </Text>
              </Space>
              {onStop && (
                <Button type="primary" size="small" icon={<StopOutlined />} onClick={() => onStop(line)}>
                  Stop Tracking
                </Button>
              )}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  );
};

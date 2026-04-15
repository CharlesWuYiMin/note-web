import { Modal } from 'antd'

export function openCenteredConfirm({
  title,
  content,
  icon,
  okText,
  cancelText,
  okButtonProps,
  cancelButtonProps,
  onOk,
  ...rest
}) {
  return Modal.confirm({
    centered: true,
    maskClosable: false,
    title,
    content,
    icon,
    okText,
    cancelText,
    okButtonProps,
    cancelButtonProps,
    onOk,
    ...rest,
  })
}

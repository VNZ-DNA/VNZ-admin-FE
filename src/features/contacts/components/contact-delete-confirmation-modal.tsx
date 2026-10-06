import { AlertTriangle } from 'lucide-react'
import { Button, Modal, useOverlayState } from '@heroui/react'

type ContactDeleteConfirmationModalProps = {
  state: ReturnType<typeof useOverlayState>
  contactName: string | null
  isPending: boolean
  errorMessage?: string | null
  onConfirm: () => void
}

export function ContactDeleteConfirmationModal({
  state,
  contactName,
  isPending,
  errorMessage,
  onConfirm,
}: ContactDeleteConfirmationModalProps) {
  return (
    <Modal.Root state={state}>
      <Modal.Backdrop className="news-delete__backdrop" isDismissable={!isPending}>
        <Modal.Container className="news-delete__container" placement="center" size="md">
          <Modal.Dialog className="news-delete__dialog">
            <Modal.Header className="news-delete__header">
              <Modal.Icon className="news-delete__icon">
                <AlertTriangle size={22} aria-hidden="true" />
              </Modal.Icon>
              <Modal.Heading className="news-delete__heading">Xóa liên hệ?</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="news-delete__body">
              <p>
                Liên hệ của “{contactName}” sẽ không còn xuất hiện trong quản trị. Dữ liệu vẫn được lưu giữ nhưng hiện chưa thể khôi phục.
              </p>
              {errorMessage && <p className="news-delete__error" role="alert">{errorMessage}</p>}
            </Modal.Body>
            <Modal.Footer className="news-delete__footer">
              <Button type="button" variant="outline" isDisabled={isPending} onClick={() => state.close()}>
                Hủy
              </Button>
              <Button className="news-delete__submit" type="button" variant="primary" isDisabled={isPending} onClick={onConfirm}>
                {isPending ? 'Đang xóa...' : 'Xóa liên hệ'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}

import { AlertTriangle } from 'lucide-react'
import { Button, Modal, useOverlayState } from '@heroui/react'

type PartnerDeleteConfirmationModalProps = {
  state: ReturnType<typeof useOverlayState>
  partnerName: string | null
  isPending: boolean
  errorMessage?: string | null
  onConfirm: () => void
}

export function PartnerDeleteConfirmationModal({
  state,
  partnerName,
  isPending,
  errorMessage,
  onConfirm,
}: PartnerDeleteConfirmationModalProps) {
  return (
    <Modal.Root state={state}>
      <Modal.Backdrop className="partner-delete__backdrop" isDismissable={!isPending}>
        <Modal.Container className="partner-delete__container" placement="center" size="md">
          <Modal.Dialog className="partner-delete__dialog">
            <Modal.Header className="partner-delete__header">
              <Modal.Icon className="partner-delete__icon">
                <AlertTriangle size={22} aria-hidden="true" />
              </Modal.Icon>
              <Modal.Heading className="partner-delete__heading">Xóa đối tác?</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="partner-delete__body">
              <p>
                Đối tác “{partnerName}” sẽ không còn xuất hiện trong quản trị và trên website. Dữ liệu và logo vẫn được lưu giữ,
                nhưng hiện chưa thể khôi phục.
              </p>
              {errorMessage && <p className="partner-delete__error" role="alert">{errorMessage}</p>}
            </Modal.Body>

            <Modal.Footer className="partner-delete__footer">
              <Button type="button" variant="outline" isDisabled={isPending} onClick={() => state.close()}>
                Hủy
              </Button>
              <Button
                className="partner-delete__submit"
                type="button"
                variant="primary"
                isDisabled={isPending}
                onClick={onConfirm}
              >
                {isPending ? 'Đang xóa...' : 'Xóa đối tác'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}

import { AlertTriangle } from 'lucide-react'
import { Button, Modal, useOverlayState } from '@heroui/react'

type TeamMemberDeleteConfirmationModalProps = {
  state: ReturnType<typeof useOverlayState>
  memberName: string | null
  isPending: boolean
  errorMessage?: string | null
  onConfirm: () => void
}

export function TeamMemberDeleteConfirmationModal({
  state,
  memberName,
  isPending,
  errorMessage,
  onConfirm,
}: TeamMemberDeleteConfirmationModalProps) {
  return (
    <Modal.Root state={state}>
      <Modal.Backdrop className="team-member-delete__backdrop" isDismissable={!isPending}>
        <Modal.Container className="team-member-delete__container" placement="center" size="md">
          <Modal.Dialog className="team-member-delete__dialog">
            <Modal.Header className="team-member-delete__header">
              <Modal.Icon className="team-member-delete__icon">
                <AlertTriangle size={22} aria-hidden="true" />
              </Modal.Icon>
              <Modal.Heading className="team-member-delete__heading">Xóa thành viên?</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="team-member-delete__body">
              <p>
                Thành viên “{memberName}” sẽ không còn xuất hiện trong quản trị và trên website. Dữ liệu vẫn được lưu giữ,
                nhưng hiện chưa thể khôi phục.
              </p>
              {errorMessage && <p className="team-member-delete__error" role="alert">{errorMessage}</p>}
            </Modal.Body>

            <Modal.Footer className="team-member-delete__footer">
              <Button type="button" variant="outline" isDisabled={isPending} onClick={() => state.close()}>
                Hủy
              </Button>
              <Button
                className="team-member-delete__submit"
                type="button"
                variant="primary"
                isDisabled={isPending}
                onClick={onConfirm}
              >
                {isPending ? 'Đang xóa...' : 'Xóa thành viên'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}

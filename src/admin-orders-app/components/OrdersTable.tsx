import React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  useDisclosure,
  Pagination,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAdminOrdersStore } from "../stores/useAdminOrdersStore";
import type { CustomerSubmission } from "../stores/useAdminOrdersStore";

const statusColors = {
  new: "warning",
  viewed: "primary",
  contacted: "secondary",
  completed: "success",
  archived: "default",
} as const;

const priorityColors = {
  low: "default",
  medium: "warning",
  high: "danger",
} as const;

export const OrdersTable: React.FC = () => {
  const {
    filteredSubmissions,
    isLoading,
    currentPage,
    itemsPerPage,
    totalPages,
    setCurrentPage,
    updateSubmissionStatus,
    updateSubmissionPriority,
    updateSubmissionNotes,
    deleteSubmission,
  } = useAdminOrdersStore();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedSubmission, setSelectedSubmission] = React.useState<CustomerSubmission | null>(null);
  const [notes, setNotes] = React.useState("");

  const columns = [
    { key: "submittedAt", label: "Date" },
    { key: "contactInfo", label: "Contact" },
    { key: "product", label: "Product" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "actions", label: "Actions" },
  ];

  const paginatedSubmissions = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSubmissions.slice(start, end);
  }, [filteredSubmissions, currentPage, itemsPerPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewDetails = (submission: CustomerSubmission) => {
    setSelectedSubmission(submission);
    setNotes(submission.notes);
    onOpen();
  };

  const handleSaveNotes = async () => {
    if (selectedSubmission) {
      await updateSubmissionNotes(selectedSubmission.id, notes);
      onClose();
    }
  };

  const handleStatusChange = async (id: string, status: CustomerSubmission["status"]) => {
    await updateSubmissionStatus(id, status);
  };

  const handlePriorityChange = async (id: string, priority: CustomerSubmission["priority"]) => {
    await updateSubmissionPriority(id, priority);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this submission?")) {
      await deleteSubmission(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Table aria-label="Customer submissions table" className="min-w-full">
        <TableHeader columns={columns}>{(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}</TableHeader>
        <TableBody items={paginatedSubmissions}>
          {(submission) => (
            <TableRow key={submission.id}>
              <TableCell>
                <div className="text-sm">{formatDate(submission.submittedAt)}</div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{submission.contactInfo.fullName}</div>
                  <div className="text-sm text-gray-500">{submission.contactInfo.email}</div>
                  {submission.contactInfo.company && <div className="text-xs text-gray-400">{submission.contactInfo.company}</div>}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium">{submission.productGroup}</div>
                  <div className="text-gray-500">{submission.productRange}</div>
                  <div className="text-gray-400">{submission.individualProduct}</div>
                </div>
              </TableCell>
              <TableCell>
                <Dropdown>
                  <DropdownTrigger>
                    <Button variant="light" size="sm">
                      <Chip color={statusColors[submission.status]} variant="flat" size="sm">
                        {submission.status}
                      </Chip>
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Status actions"
                    onAction={(key) => handleStatusChange(submission.id, key as CustomerSubmission["status"])}
                  >
                    <DropdownItem key="new">New</DropdownItem>
                    <DropdownItem key="viewed">Viewed</DropdownItem>
                    <DropdownItem key="contacted">Contacted</DropdownItem>
                    <DropdownItem key="completed">Completed</DropdownItem>
                    <DropdownItem key="archived">Archived</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </TableCell>
              <TableCell>
                <Dropdown>
                  <DropdownTrigger>
                    <Button variant="light" size="sm">
                      <Chip color={priorityColors[submission.priority]} variant="flat" size="sm">
                        {submission.priority}
                      </Chip>
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Priority actions"
                    onAction={(key) => handlePriorityChange(submission.id, key as CustomerSubmission["priority"])}
                  >
                    <DropdownItem key="low">Low</DropdownItem>
                    <DropdownItem key="medium">Medium</DropdownItem>
                    <DropdownItem key="high">High</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button isIconOnly size="sm" variant="light" onPress={() => handleViewDetails(submission)}>
                    <Icon icon="heroicons:eye" className="w-4 h-4" />
                  </Button>
                  <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(submission.id)}>
                    <Icon icon="heroicons:trash" className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination total={totalPages} page={currentPage} onChange={setCurrentPage} />
        </div>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Submission Details</ModalHeader>
              <ModalBody>
                {selectedSubmission && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Contact Information</h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="font-medium">Name:</span> {selectedSubmission.contactInfo.fullName}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {selectedSubmission.contactInfo.email}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {selectedSubmission.contactInfo.phone}
                          </div>
                          <div>
                            <span className="font-medium">Company:</span> {selectedSubmission.contactInfo.company}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Product Selection</h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="font-medium">Group:</span> {selectedSubmission.productGroup}
                          </div>
                          <div>
                            <span className="font-medium">Range:</span> {selectedSubmission.productRange}
                          </div>
                          <div>
                            <span className="font-medium">Product:</span> {selectedSubmission.individualProduct}
                          </div>
                        </div>
                      </div>
                    </div>

                    {Object.keys(selectedSubmission.options).length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Options</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(selectedSubmission.options).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedSubmission.contactInfo.message && (
                      <div>
                        <h4 className="font-medium mb-2">Customer Message</h4>
                        <p className="text-sm bg-gray-50 p-3 rounded">{selectedSubmission.contactInfo.message}</p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium mb-2">Internal Notes</h4>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add internal notes about this submission..."
                        minRows={3}
                      />
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleSaveNotes}>
                  Save Notes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
